import { describe, expect, it } from 'vitest';
import { finalSpan, finalVersion, liveVersions, reportStatus, type FinalReportState, type ReportVersion } from './finalReportData.js';

const v = (n: number, extra: Partial<ReportVersion> = {}): ReportVersion => ({
  id: `v${n}`, versionNumber: n, source: 'scalar_export', fileName: `r-v${n}.pdf`, valuationRevisionId: 1,
  createdBy: 'A', createdAt: `2026-10-0${n}T10:00:00`, ...extra,
});

const state = (over: Partial<FinalReportState> = {}): FinalReportState => ({
  hasValuation: true, revision: { id: 1, savedAt: '2026-10-01T09:00:00' }, versions: [v(1), v(2), v(3)],
  final: { reportVersionId: 'v3', publishedBy: 'A', publishedAt: '2026-11-05T08:00:00' },
  audit: [
    { at: '2026-10-02T12:00:00', by: 'A', versionId: 'v2', action: 'set-final' },
    { at: '2026-11-05T08:00:00', by: 'A', versionId: 'v3', replaced: 'v2', action: 'set-final' },
  ],
  ...over,
});

describe('final report versions', () => {
  it('hides deleted versions but keeps their numbers', () => {
    const s = state({ versions: [v(1, { deletedAt: '2026-11-05T09:00:00', deletedBy: 'A' }), v(2), v(3)] });
    expect(liveVersions(s).map((x) => x.versionNumber)).toEqual([2, 3]);
    expect(Math.max(...s.versions.map((x) => x.versionNumber)) + 1).toBe(4);
  });

  it('knows when a version was the one clients saw', () => {
    const s = state();
    expect(finalSpan(s, 'v2')).toEqual({ from: '2026-10-02T12:00:00', to: '2026-11-05T08:00:00' });
    expect(finalSpan(s, 'v3')).toEqual({ from: '2026-11-05T08:00:00', to: undefined });
    expect(finalSpan(s, 'v1')).toBeNull();
  });

  it('never treats a deleted version as final', () => {
    const s = state({ versions: [v(1), v(2), v(3, { deletedAt: '2026-11-05T09:00:00' })] });
    expect(finalVersion(s)).toBeUndefined();
    expect(reportStatus(s)).toBe('not-created');
  });
});
