/**
 * PROTOTYPE-ONLY persistence and transfer adapter (P0.4, P0.6).
 *
 * Request data lives in localStorage and uploaded file bytes in IndexedDB, both
 * in this browser only. Nothing leaves the machine and nothing is encrypted or
 * scanned — the UI says so, and never claims a secure upload (P0.9). Swap this
 * module for the API client; the screen only talks to `usePortalStore`.
 *
 * Lifecycle (P0.3): validating → uploading → saving → submitted, or failed.
 * Status advances to Complete only when the save resolves (G3.7). A failure
 * keeps the request Pending, records the error and allows a retry.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { REQUEST_META, seedDueDate } from './fixtures.js';
import {
  currentFiles, maxFilesOf, validateFile, type ChoiceSelection, type InformationRequest, type RequestStatus, type UploadedFile,
} from './model.js';

export type Phase = 'idle' | 'validating' | 'uploading' | 'saving' | 'failed';
export interface OpState { phase: Phase; progress?: number; error?: string; fileName?: string }

interface Persisted {
  requests: InformationRequest[];
  dueDate: string;
  /** Express mode files the recipient left unsorted. Bytes live in IndexedDB under the same id. */
  unsorted?: UploadedFile[];
}

// v3: shortNote / details / maxFiles and replaced versions changed the stored shape.
const KEY = (key: string) => `scalar.request-portal.v3.${key}`;
const LATENCY = 700;

function load(key: string, seed: () => InformationRequest[]): Persisted {
  try {
    const raw = window.localStorage.getItem(KEY(key));
    if (raw) return JSON.parse(raw) as Persisted;
  } catch { /* storage blocked: start from the fixture */ }
  return { requests: seed(), dueDate: seedDueDate() };
}

function persist(key: string, data: Persisted) {
  try { window.localStorage.setItem(KEY(key), JSON.stringify(data)); } catch { /* ignore */ }
}

/** Read another company's stored list without mounting it (the fund-admin company menu). */
export function peekRequests(key: string, seed: () => InformationRequest[]): InformationRequest[] {
  return load(key, seed).requests;
}

/** Add requests to a stored list without mounting it (Company · Documents › New Info Request sends them). */
export function appendRequests(key: string, seed: () => InformationRequest[], add: InformationRequest[], dueDate?: string) {
  const d = load(key, seed);
  persist(key, { ...d, requests: [...d.requests, ...add], dueDate: dueDate ?? d.dueDate });
}

/* ---- file bytes (IndexedDB) ---- */

const DB = 'scalar-request-portal';
function db(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore('files');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function putBytes(id: string, blob: Blob) {
  const d = await db();
  await new Promise<void>((res, rej) => {
    const tx = d.transaction('files', 'readwrite');
    tx.objectStore('files').put(blob, id);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}
async function getBytes(id: string): Promise<Blob | undefined> {
  const d = await db();
  return new Promise((res, rej) => {
    const r = d.transaction('files').objectStore('files').get(id);
    r.onsuccess = () => res(r.result as Blob | undefined);
    r.onerror = () => rej(r.error);
  });
}

const wait = (ms: number) => new Promise((r) => window.setTimeout(r, ms));
const now = () => new Date().toISOString();

export function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * `key` names one company's copy of one fixture; `seed` builds it the first time.
 * Changing `key` (switching company) loads that company's list.
 */
export function usePortalStore(key: string, seed: () => InformationRequest[]) {
  const [data, setData] = useState<Persisted>(() => load(key, seed));
  const [loadedKey, setLoadedKey] = useState(key);
  const [ops, setOps] = useState<Record<string, OpState>>({});
  // React's "reset state when a prop changes": re-render with the other company's list before commit.
  // This render already uses that list, so nothing reads one company's requests against another's categories.
  const fresh = loadedKey !== key ? load(key, seed) : null;
  if (fresh) {
    setLoadedKey(key);
    setData(fresh);
    setOps({});
  }
  const current = fresh ?? data;
  const [simulateFailure, setSimulateFailure] = useState(false);
  const failRef = useRef(simulateFailure);
  failRef.current = simulateFailure;
  const inFlight = useRef(new Set<string>());
  const cancelled = useRef(new Set<string>());

  useEffect(() => { if (loadedKey === key) persist(key, data); }, [key, loadedKey, data]);

  const setOp = (id: string, op: OpState | null) =>
    setOps((o) => { const n = { ...o }; if (op) n[id] = op; else delete n[id]; return n; });

  const patch = useCallback((ids: readonly string[], fn: (r: InformationRequest) => InformationRequest) =>
    setData((d) => ({ ...d, requests: d.requests.map((r) => (ids.includes(r.id) ? { ...fn(r), updatedAt: now() } : r)) })), []);

  /** Text / choice / date. Completes only after the save resolves. */
  const saveAnswer = useCallback(async (id: string, answer: string, viaExpress = false) => {
    if (inFlight.current.has(id)) return false; // no duplicate submissions
    inFlight.current.add(id);
    setOp(id, { phase: 'saving' });
    await wait(LATENCY);
    inFlight.current.delete(id);
    if (failRef.current) {
      setOp(id, { phase: 'failed', error: 'Your answer was not saved. Check your connection and try again — what you typed is kept.' });
      return false;
    }
    patch([id], (r) => ({ ...r, answer, status: 'complete', answeredViaExpress: viaExpress || undefined }));
    setOp(id, null);
    return true;
  }, [patch]);

  /** File / completed template: validate → upload (progress) → save → Complete. */
  const uploadFile = useCallback(async (req: InformationRequest, file: File, viaExpress = false) => {
    if (inFlight.current.has(req.id)) return false;
    setOp(req.id, { phase: 'validating', fileName: file.name });
    const invalid = validateFile(file, req);
    if (invalid) { setOp(req.id, { phase: 'failed', error: invalid, fileName: file.name }); return false; }
    inFlight.current.add(req.id);
    cancelled.current.delete(req.id);
    for (const p of [15, 40, 65, 90]) {
      setOp(req.id, { phase: 'uploading', progress: p, fileName: file.name });
      await wait(LATENCY / 4);
      // Cancel stops before the save: nothing is attached and the request keeps its state.
      if (cancelled.current.has(req.id)) { cancelled.current.delete(req.id); inFlight.current.delete(req.id); setOp(req.id, null); return false; }
    }
    setOp(req.id, { phase: 'saving', progress: 100, fileName: file.name });
    await wait(LATENCY / 2);
    inFlight.current.delete(req.id);
    if (failRef.current) {
      setOp(req.id, { phase: 'failed', error: `${file.name} did not finish uploading, so this request is still pending. Try again.`, fileName: file.name });
      return false;
    }
    const meta: UploadedFile = {
      id: `f-${Math.random().toString(36).slice(2, 10)}`,
      requestId: req.id,
      name: file.name,
      mimeType: file.type || 'application/octet-stream',
      sizeBytes: file.size,
      uploadedAt: now(),
      uploadedBy: REQUEST_META.respondent,
      version: (req.files?.length ?? 0) + 1,
      viaExpress: viaExpress || undefined,
    };
    try {
      await putBytes(meta.id, file);
    } catch {
      setOp(req.id, { phase: 'failed', error: `${file.name} could not be stored in this browser. Try again.`, fileName: file.name });
      return false;
    }
    // At the request's file limit the new upload replaces the oldest current file; replaced files stay for the audit trail.
    patch([req.id], (r) => {
      const all = r.files ?? [];
      const current = currentFiles(r);
      const replaceId = current.length >= maxFilesOf(r) ? current[0]?.id : undefined;
      const kept = all.map((f) => (f.id === replaceId ? { ...f, replaced: true } : f));
      return { ...r, files: [...kept, { ...meta, version: all.length + 1 }], status: 'complete' };
    });
    setOp(req.id, null);
    return true;
  }, [patch]);

  /**
   * Multiple choice. Completes after the save resolves. `clearIds` are follow-ups
   * the new selection no longer calls for: their answers and files are removed
   * (the screen confirms that first) so a stale follow-up never counts.
   */
  const saveSelection = useCallback(async (id: string, selection: ChoiceSelection, clearIds: readonly string[] = [], viaExpress = false) => {
    if (inFlight.current.has(id)) return false;
    inFlight.current.add(id);
    setOp(id, { phase: 'saving' });
    await wait(LATENCY);
    inFlight.current.delete(id);
    if (failRef.current) {
      setOp(id, { phase: 'failed', error: 'Your answer was not saved. Check your connection and try again — your choices are kept.' });
      return false;
    }
    setData((d) => ({
      ...d,
      requests: d.requests.map((r) => {
        if (r.id === id) return { ...r, selection, status: 'complete', answeredViaExpress: viaExpress || undefined, updatedAt: now() };
        if (clearIds.includes(r.id)) return { ...r, answer: undefined, selection: undefined, files: undefined, status: 'pending', updatedAt: now() };
        return r;
      }),
    }));
    setOp(id, null);
    return true;
  }, []);

  const clearError = useCallback((id: string) => setOp(id, null), []);

  /** Stops an upload before it is saved. */
  const cancelUpload = useCallback((id: string) => { if (inFlight.current.has(id)) cancelled.current.add(id); }, []);

  /** Removing the last current file returns a completed request to Pending. Undo puts both back (`restoreFile`). */
  const removeFile = useCallback((reqId: string, fileId: string) =>
    patch([reqId], (r) => {
      const files = (r.files ?? []).filter((f) => f.id !== fileId);
      return { ...r, files, status: currentFiles({ files }).length || r.status !== 'complete' ? r.status : 'pending' };
    }), [patch]);

  const restoreFile = useCallback((reqId: string, file: UploadedFile, status: RequestStatus) =>
    patch([reqId], (r) => ({ ...r, files: [...(r.files ?? []), file].sort((a, b) => a.version - b.version), status })), [patch]);

  const downloadUpload = useCallback(async (f: UploadedFile) => {
    const blob = await getBytes(f.id).catch(() => undefined);
    if (!blob) return false;
    saveBlob(blob, f.name);
    return true;
  }, []);

  /** Mark N/A / sent another way. Answers and files already saved stay attached. */
  const setStatus = useCallback((ids: readonly string[], status: RequestStatus) => patch(ids, (r) => ({ ...r, status })), [patch]);

  /**
   * Reopen (G2.7): status returns to Pending at once; the saved answer and files
   * stay attached and visible, so the respondent can edit or replace them.
   */
  const reopen = useCallback((ids: readonly string[]) => patch(ids, (r) => ({ ...r, status: 'pending' })), [patch]);

  const delegate = useCallback(async (ids: readonly string[], email: string) => {
    await wait(LATENCY);
    if (failRef.current) throw new Error('Delegation was not saved. Try again.');
    patch(ids, (r) => ({ ...r, delegatee: email }));
  }, [patch]);

  /* ---- Express mode: files the recipient left unsorted ---- */

  /** Keep files no request matched, so the recipient can place them later. */
  const addUnsorted = useCallback(async (files: readonly File[]) => {
    const metas: UploadedFile[] = [];
    for (const file of files) {
      const meta: UploadedFile = {
        id: `f-${Math.random().toString(36).slice(2, 10)}`, requestId: '', name: file.name,
        mimeType: file.type || 'application/octet-stream', sizeBytes: file.size, uploadedAt: now(),
        uploadedBy: REQUEST_META.respondent, version: 1, viaExpress: true,
      };
      try { await putBytes(meta.id, file); metas.push(meta); } catch { /* not stored: left out of the tray */ }
    }
    setData((d) => ({ ...d, unsorted: [...(d.unsorted ?? []), ...metas] }));
    return metas.length;
  }, []);

  const removeUnsorted = useCallback((fileId: string) =>
    setData((d) => ({ ...d, unsorted: (d.unsorted ?? []).filter((f) => f.id !== fileId) })), []);

  /** Upload an unsorted file to a request. It leaves the tray only once the upload is saved. */
  const assignUnsorted = useCallback(async (f: UploadedFile, req: InformationRequest) => {
    const blob = await getBytes(f.id).catch(() => undefined);
    if (!blob) return false;
    const ok = await uploadFile(req, new File([blob], f.name, { type: f.mimeType }), true);
    if (ok) removeUnsorted(f.id);
    return ok;
  }, [uploadFile, removeUnsorted]);

  /** The sender (Scalar or firm user) sets the due date directly; no request, no approval. */
  const setDueDate = useCallback((iso: string) => setData((d) => ({ ...d, dueDate: iso })), []);

  /** Clears every stored company of this fixture, so the fund-admin menu resets too. */
  const reset = useCallback((keys: readonly string[] = [key]) => {
    try { keys.forEach((k) => window.localStorage.removeItem(KEY(k))); } catch { /* ignore */ }
    setData(load(key, seed));
    setOps({});
  }, [key, seed]);

  return {
    requests: current.requests, dueDate: current.dueDate, unsorted: current.unsorted ?? [], ops: fresh ? {} : ops,
    simulateFailure, setSimulateFailure,
    saveAnswer, saveSelection, uploadFile, cancelUpload, clearError, removeFile, restoreFile, downloadUpload, setStatus, reopen, delegate, setDueDate, reset,
    addUnsorted, removeUnsorted, assignUnsorted,
  };
}

export type PortalStore = ReturnType<typeof usePortalStore>;

/** Fetch a template asset and save it with its own name and type. Returns an error message or null (G3.4). */
export async function downloadTemplate(path: string, fileName: string, mimeType: string): Promise<string | null> {
  try {
    const res = await fetch(path);
    if (!res.ok) return 'This template is not available right now. Contact your analyst and they will send it directly.';
    const blob = new Blob([await res.arrayBuffer()], { type: mimeType });
    saveBlob(blob, fileName);
    return null;
  } catch {
    return 'The template could not be downloaded. Check your connection and try again.';
  }
}
