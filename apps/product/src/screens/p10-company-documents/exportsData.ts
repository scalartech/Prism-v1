/**
 * Exports — the data files the platform generates (Excel exports from
 * Financials, Cap Table or Waterfall), kept apart from what the client and the
 * team upload (implementation plan §3). Files move here by origin, never by
 * folder name: a user-made folder called "Exports" stays in Documents.
 * PDF report exports are not here; they are Final Report versions.
 *
 * Prototype-only: kept in this browser's localStorage per company.
 */
import { useMemo } from 'react';
import { companyById, user } from '../../data/fixtures.js';
import { readPersisted, usePersisted, writePersisted } from './persisted.js';

export type ExportSource = 'Financials' | 'Cap Table' | 'Waterfall';

export interface ExportFile {
  id: string;
  /** Always `system`: only platform-generated files live here. */
  origin: 'system';
  /** US date, the measurement-date folder it belongs to. */
  measurementDate: string;
  fileName: string;
  sourceScreen: ExportSource;
  exportedBy: string;
  /** ISO date-time. */
  exportedAt: string;
}

const keyOf = (companyId: string) => `scalar.exports.v1.${companyId}`;

/** The four exports that used to sit in the Documents tree's "Exports" folder, plus one each from Cap Table and Waterfall. */
function seed(companyId: string): ExportFile[] {
  const c = companyById(companyId);
  const e = (id: string, fileName: string, sourceScreen: ExportSource, exportedAt: string): ExportFile => ({
    id, origin: 'system', measurementDate: c.asOf, fileName, sourceScreen, exportedBy: 'Steven Hansen', exportedAt,
  });
  return [
    e('e1', `${c.name}_Financials_281_${c.asOfIso}.xlsx`, 'Financials', '2026-10-02T09:12:00'),
    e('e2', `${c.name}_Financials_281_${c.asOfIso} (1).xlsx`, 'Financials', '2026-10-02T09:41:00'),
    e('e3', `${c.name}_Financials_5388_${c.asOfIso}.xlsx`, 'Financials', '2026-10-14T14:02:00'),
    e('e4', `${c.name}_Financials_5388_${c.asOfIso} (1).xlsx`, 'Financials', '2026-10-14T14:05:00'),
    e('e5', `${c.name}_CapTable_${c.asOfIso}.xlsx`, 'Cap Table', '2026-10-20T11:30:00'),
    e('e6', `${c.name}_Waterfall_${c.asOfIso}.xlsx`, 'Waterfall', '2026-10-28T16:47:00'),
  ];
}

export function useExports(companyId: string) {
  const seedFn = useMemo(() => () => seed(companyId), [companyId]);
  const [files, set] = usePersisted<ExportFile[]>(keyOf(companyId), seedFn);
  return {
    files,
    remove(ids: string[]) { set((cur) => cur.filter((f) => !ids.includes(f.id))); },
  };
}

/** The pages an Excel Export covers decide which screen it is filed under. */
const sourceOf = (pages: string[]): ExportSource =>
  pages.some((p) => p.startsWith('Financials')) ? 'Financials'
    : pages.some((p) => ['Cap Table', 'Fund Ownership', 'Breakpoints', 'Cash Flow Ledger'].includes(p)) ? 'Cap Table'
      : 'Waterfall';

/** Every export action saves here. Returns the saved file. */
export function addExport(companyId: string, measurementDate: string, pages: string[]): ExportFile {
  const c = companyById(companyId);
  const cur = readPersisted(keyOf(companyId), () => seed(companyId));
  const source = sourceOf(pages);
  const base = `${c.name}_${source.replace(' ', '')}_${c.asOfIso}`;
  const same = cur.filter((f) => f.fileName.startsWith(base)).length;
  const file: ExportFile = {
    id: `e-${Date.now()}`, origin: 'system', measurementDate, sourceScreen: source, exportedBy: user.name,
    exportedAt: new Date().toISOString().slice(0, 19),
    fileName: `${base}${same ? ` (${same})` : ''}.xlsx`,
  };
  writePersisted(keyOf(companyId), [...cur, file]);
  return file;
}

/** "Oct 2, 2026 · 9:12 AM" — the time tells repeated names apart. */
export function formatStamp(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
}
