/**
 * Company · Documents & Requests — the company's information requests, as the
 * signed-in sender sees them. The list itself is the Unified Request Portal's
 * (same model, store and rows); this module adds what only the sender has:
 * who each request was sent to, and the introduction they wrote.
 *
 * Prototype-only: everything lives in this browser's localStorage, like the portal.
 */
import { CATEGORIES, INTRODUCTION, REQUEST_META, seedDueDate, seedFor } from '../prototypes/request-portal/fixtures.js';
import {
  DOC_EXTENSIONS, isResolved, type InformationRequest, type ResponseType,
} from '../prototypes/request-portal/model.js';
import { appendRequests, peekRequests } from '../prototypes/request-portal/store.js';

export { CATEGORIES };

/** `empty` starts with nothing sent; every other state starts from the portal's mixed fixture. */
const listOf = (state: string) => (state === 'empty' ? 'empty' : 'default');
export const requestsKey = (companyId: string, state = 'default') => `company.${companyId}.${listOf(state)}`;
export const requestsSeed = (state = 'default') => () => (listOf(state) === 'empty' ? [] : seedFor('default', 0));

/* ---- who each request went to ---- */

export interface SentBatch {
  id: string;
  /** ISO date the batch was sent. */
  sentAt: string;
  recipients: string[];
  requestIds: string[];
}

interface Meta { batches: SentBatch[]; introduction: string[] }

const META_KEY = (companyId: string, state: string) => `scalar.company-requests.v1.${companyId}.${listOf(state)}`;

function seedMeta(state: string): Meta {
  const ids = requestsSeed(state)().map((r) => r.id);
  return {
    batches: ids.length ? [{ id: 'seed', sentAt: '2026-10-27', recipients: [REQUEST_META.respondent], requestIds: ids }] : [],
    introduction: ids.length ? INTRODUCTION : [],
  };
}

export function loadMeta(companyId: string, state = 'default'): Meta {
  try {
    const raw = window.localStorage.getItem(META_KEY(companyId, state));
    if (raw) return JSON.parse(raw) as Meta;
  } catch { /* storage blocked: start from the seed */ }
  return seedMeta(state);
}

function saveMeta(companyId: string, state: string, meta: Meta) {
  try { window.localStorage.setItem(META_KEY(companyId, state), JSON.stringify(meta)); } catch { /* ignore */ }
}

export function resetCompanyRequests(companyId: string, state = 'default') {
  try { window.localStorage.removeItem(META_KEY(companyId, state)); } catch { /* ignore */ }
}

/** Recipients of a request (a follow-up goes to whoever got its parent). */
export function recipientsOf(meta: Meta, r: Pick<InformationRequest, 'id' | 'parentId'>): string[] {
  const id = r.parentId ?? r.id;
  return [...new Set(meta.batches.filter((b) => b.requestIds.includes(id)).flatMap((b) => b.recipients))];
}

/* ---- the request builder ---- */

/** What the builder offers: the portal's response types that need no asset from Scalar. */
export const BUILDER_TYPES: ResponseType[] = ['file', 'text', 'choice', 'date'];

export interface DraftRequest {
  key: string;
  categoryId: string;
  title: string;
  responseType: ResponseType;
}

/**
 * Turn the drafts into pending requests, numbered after whatever the company
 * already has in each category (numbers never move), and record who they went to.
 */
export function sendInformationRequest(companyId: string, drafts: DraftRequest[], recipients: string[], dueDate: string, introduction: string[]) {
  const key = requestsKey(companyId);
  const seed = requestsSeed();
  const existing = peekRequests(key, seed);
  const next = new Map<string, number>();
  const stamp = Date.now();
  const added: InformationRequest[] = drafts.map((d, i) => {
    const cat = CATEGORIES.find((c) => c.id === d.categoryId)!;
    const order = next.get(cat.id) ?? Math.max(0, ...existing.filter((r) => r.categoryId === cat.id).map((r) => r.requestOrder));
    next.set(cat.id, order + 1);
    return {
      id: `n-${stamp}-${i}`,
      categoryId: cat.id,
      categoryOrder: cat.order,
      requestOrder: order + 1,
      title: d.title.trim(),
      responseType: d.responseType,
      status: 'pending',
      ...(d.responseType === 'file' ? { allowedExtensions: DOC_EXTENSIONS, maxFiles: 5 } : {}),
    };
  });
  appendRequests(key, seed, added, dueDate);
  const meta = loadMeta(companyId);
  saveMeta(companyId, 'default', {
    batches: [...meta.batches, { id: `b-${stamp}`, sentAt: new Date().toISOString().slice(0, 10), recipients, requestIds: added.map((r) => r.id) }],
    introduction,
  });
  return added.length;
}

/* ---- counts for the Documents / Questions / Requests heading ---- */

const QUESTION_TYPES: ResponseType[] = ['text', 'choice', 'multiple_choice', 'date'];

export interface RequestCounts { total: number; resolved: number; pending: number; questions: number; questionsAnswered: number }

export function requestCounts(companyId: string, state = 'default'): RequestCounts {
  const every = peekRequests(requestsKey(companyId, state), requestsSeed(state));
  const all = every.filter((r) => !r.parentId);
  const qs = all.filter((r) => QUESTION_TYPES.includes(r.responseType));
  const resolved = all.filter((r) => isResolved(r, every)).length;
  return {
    total: all.length,
    resolved,
    pending: all.length - resolved,
    questions: qs.length,
    questionsAnswered: qs.filter((r) => isResolved(r, every)).length,
  };
}

export { seedDueDate };
