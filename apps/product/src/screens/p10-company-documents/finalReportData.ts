/**
 * Final Report — one per company and measurement date (implementation plan §5, §7).
 *
 * A company's report has many versions (PDF exports made by Scalar from the
 * valuation, and reports uploaded by the team) and one pointer to the version
 * that is Final: the only file the client sees. Each export records the
 * valuation revision it was made from; any later saved revision makes it Out
 * of date. Nothing here ever moves the Final pointer by itself — the client
 * keeps the last version the analyst chose until the analyst picks again.
 *
 * Prototype-only: the store lives in this browser's localStorage, seeded per
 * company so the Reports roll-up shows every status. Open questions 2, 3 and 6
 * (which saves count, drafts, what "Scalar-made" means) are not decided here.
 */
import { useMemo } from 'react';
import { companyById, user } from '../../data/fixtures.js';
import { clearPersisted, readPersisted, usePersisted } from './persisted.js';

export interface ReportVersion {
  id: string;
  versionNumber: number;
  source: 'scalar_export' | 'upload';
  fileName: string;
  /** The valuation revision an export was made from; null for uploads. */
  valuationRevisionId: number | null;
  createdBy: string;
  /** ISO date-time. */
  createdAt: string;
}

export interface FinalPointer {
  reportVersionId: string;
  publishedBy: string;
  publishedAt: string;
}

export interface AuditEntry { at: string; by: string; versionId: string; replaced?: string }

export interface FinalReportState {
  /** False when the company has no valuation for this measurement date. */
  hasValuation: boolean;
  /** The valuation's latest saved revision. */
  revision: { id: number; savedAt: string };
  versions: ReportVersion[];
  final?: FinalPointer;
  audit: AuditEntry[];
}

export type ReportStatus = 'published' | 'out-of-date' | 'not-created' | 'no-valuation';

export const reportStatusLabel: Record<ReportStatus, string> = {
  published: 'Published',
  'out-of-date': 'Out of date',
  'not-created': 'Not created',
  'no-valuation': 'No valuation for this date',
};

/** `empty` starts with no versions; every other state uses the company's seeded report. */
const variantOf = (state: string) => (state === 'empty' || state === 'client-empty' ? 'empty' : 'default');
const keyOf = (companyId: string, date: string, state: string) =>
  `scalar.final-report.v1.${companyId}.${date.replace(/\//g, '-')}.${variantOf(state)}`;

/** "03/31/2025" → "03-31-2025", for file names. */
const dashed = (us: string) => us.replace(/\//g, '-');
export const reportFileName = (companyName: string, date: string, n: number) => `${companyName} – Valuation ${dashed(date)} – v${n}.pdf`;

const hash = (s: string) => [...s].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);

function seed(companyId: string, date: string, state: string): FinalReportState {
  const name = companyById(companyId).name;
  const v = (n: number, source: ReportVersion['source'], rev: number | null, by: string, at: string): ReportVersion => ({
    id: `v${n}`, versionNumber: n, source, valuationRevisionId: rev, createdBy: by, createdAt: at,
    fileName: source === 'upload' ? `${name} valuation report (final, signed) v${n}.pdf` : reportFileName(name, date, n),
  });
  const final = (id: string, at: string): FinalPointer => ({ reportVersionId: id, publishedBy: 'Steven Hansen', publishedAt: at });
  if (variantOf(state) === 'empty') return { hasValuation: true, revision: { id: 1, savedAt: '2026-10-01T10:00:00' }, versions: [], audit: [] };

  // ABC Co, the company every frame opens on: three versions, the final one made before the valuation changed on Nov 3.
  if (companyId === 'abc-co') {
    return {
      hasValuation: true,
      revision: { id: 3, savedAt: '2026-11-03T16:20:00' },
      versions: [
        v(1, 'scalar_export', 1, 'Steven Hansen', '2026-09-30T11:05:00'),
        v(2, 'upload', null, 'Steven Hansen', '2026-10-12T15:42:00'),
        v(3, 'scalar_export', 2, 'Steven Hansen', '2026-10-20T09:18:00'),
      ],
      final: final('v3', '2026-10-21T08:30:00'),
      audit: [{ at: '2026-10-21T08:30:00', by: 'Steven Hansen', versionId: 'v3' }],
    };
  }
  switch (hash(companyId) % 5) {
    case 0: return { hasValuation: true, revision: { id: 1, savedAt: '2026-09-28T10:00:00' }, versions: [v(1, 'scalar_export', 1, 'Steven Hansen', '2026-10-06T14:10:00')], final: final('v1', '2026-10-07T09:00:00'), audit: [] };
    case 1: return { hasValuation: true, revision: { id: 2, savedAt: '2026-11-03T16:20:00' }, versions: [v(1, 'scalar_export', 1, 'Steven Hansen', '2026-10-02T13:30:00')], final: final('v1', '2026-10-02T17:00:00'), audit: [] };
    case 2: return { hasValuation: true, revision: { id: 1, savedAt: '2026-10-15T10:00:00' }, versions: [], audit: [] };
    case 3: return { hasValuation: true, revision: { id: 1, savedAt: '2026-09-15T10:00:00' }, versions: [v(1, 'upload', null, 'Steven Hansen', '2026-10-09T11:00:00')], final: final('v1', '2026-10-09T11:30:00'), audit: [] };
    default: return { hasValuation: false, revision: { id: 0, savedAt: '2026-01-01T00:00:00' }, versions: [], audit: [] };
  }
}

/** An export is out of date once a later revision is saved; an upload, once the valuation changes after it. */
export function isOutOfDate(s: FinalReportState, v: ReportVersion): boolean {
  return v.source === 'scalar_export'
    ? (v.valuationRevisionId ?? 0) < s.revision.id
    : new Date(v.createdAt) < new Date(s.revision.savedAt);
}

export const finalVersion = (s: FinalReportState) => s.versions.find((v) => v.id === s.final?.reportVersionId);

export function reportStatus(s: FinalReportState): ReportStatus {
  if (!s.hasValuation) return 'no-valuation';
  const f = finalVersion(s);
  if (!f) return 'not-created';
  return isOutOfDate(s, f) ? 'out-of-date' : 'published';
}

/** "Prepared by Scalar" for Scalar's exports, "Uploaded by …" for uploads. */
export const provenanceOf = (v: ReportVersion) => (v.source === 'scalar_export' ? 'Prepared by Scalar' : `Uploaded by ${v.createdBy}`);

/** Read a company's report without subscribing (the Reports roll-up). */
export const peekFinalReport = (companyId: string, date: string, state = 'default') =>
  readPersisted(keyOf(companyId, date, state), () => seed(companyId, date, state));

export function useFinalReport(companyId: string, date: string, state = 'default') {
  const key = keyOf(companyId, date, state);
  const seedFn = useMemo(() => () => seed(companyId, date, state), [companyId, date, state]);
  const [s, set] = usePersisted<FinalReportState>(key, seedFn);
  const name = companyById(companyId).name;
  const now = () => new Date().toISOString().slice(0, 19);
  const nextNumber = () => Math.max(0, ...s.versions.map((v) => v.versionNumber)) + 1;

  return {
    state: s,
    status: reportStatus(s),
    final: finalVersion(s),
    /** A PDF made from the valuation as it stands now. */
    createExport(): ReportVersion {
      const n = nextNumber();
      const v: ReportVersion = {
        id: `v${n}`, versionNumber: n, source: 'scalar_export', fileName: reportFileName(name, date, n),
        valuationRevisionId: s.revision.id, createdBy: user.name, createdAt: now(),
      };
      set((cur) => ({ ...cur, versions: [...cur.versions, v] }));
      return v;
    },
    upload(fileName: string): ReportVersion {
      const n = nextNumber();
      const v: ReportVersion = { id: `v${n}`, versionNumber: n, source: 'upload', fileName, valuationRevisionId: null, createdBy: user.name, createdAt: now() };
      set((cur) => ({ ...cur, versions: [...cur.versions, v] }));
      return v;
    },
    /** One final per company and date: setting one replaces the pointer and records who replaced what. */
    setFinal(versionId: string) {
      set((cur) => ({
        ...cur,
        final: { reportVersionId: versionId, publishedBy: user.name, publishedAt: now() },
        audit: [...cur.audit, { at: now(), by: user.name, versionId, replaced: cur.final?.reportVersionId }],
      }));
    },
    /** Prototype: a saved change to the valuation, as if the analyst edited an input. */
    saveValuationChange() {
      set((cur) => ({ ...cur, hasValuation: true, revision: { id: cur.revision.id + 1, savedAt: now() } }));
    },
    reset() { clearPersisted(key); },
  };
}

export type FinalReportStore = ReturnType<typeof useFinalReport>;
