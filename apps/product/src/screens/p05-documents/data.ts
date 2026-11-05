/**
 * Demo content for the firm Documents page, copied from the Figma frames
 * (05 · Documents (Firm) → All Documents / Company Documents).
 */
import { db } from '../../data/fixtures.js';

export interface DocCompany {
  id: string;
  name: string;
  fund?: string;
  count: number;
}

/** Document counts drawn in the frame (All Companies list), keyed by company id. */
const FRAME_COUNTS: Record<string, number> = {
  'abc-co': 7, 'backside-blocks': 28, captable: 0, cohesity: 1, 'company-31': 11, comps: 0, databricks: 55,
  'debt-only': 9, 'dec-30-md': 1, 'empty-company': 1, 'euros-financials': 14, 'fund-owns-preferred-notes': 4,
  'future-4-liq-pref': 6, 'future-exit-liq-pref': 2, gpc: 1, jan23: 7,
};

const toDocCompany = (c: ReturnType<typeof db.companies.all>[number]): DocCompany => ({
  id: c.id,
  name: c.name,
  fund: db.funds.byId(c.fundId)?.name,
  // Companies not drawn in the frame get a plausible count from their record.
  count: FRAME_COUNTS[c.id] ?? (c.securities * 3 + c.name.length) % 40,
});

/**
 * The All Companies list: the companies drawn in the frame first, in frame
 * order, then the rest of the database A–Z. Filtering goes through db.search.
 */
export function docCompanies(query = ''): DocCompany[] {
  if (query.trim()) return db.companies.search(query, db.companies.count).map(toDocCompany);
  const first = Object.keys(FRAME_COUNTS).map((id) => db.companies.byId(id)).filter((c): c is NonNullable<typeof c> => !!c);
  const seen = new Set(first.map((c) => c.id));
  return [...first, ...db.companies.all().filter((c) => !seen.has(c.id))].map(toDocCompany);
}

/** How many rows of the list fit before the "↓ N companies" scroll hint. */
export const VISIBLE_COMPANIES = 16;

export interface DocFile {
  id: string;
  name: string;
  uploader: string;
  date: string;
  /** Area or request the file is linked to. */
  link?: string;
}

export interface DocFolder {
  id: string;
  name: string;
  files: DocFile[];
}

const f = (id: string, name: string, uploader: string, date: string, link?: string): DocFile => ({ id, name, uploader, date, link });

export const rootFiles: DocFile[] = [
  f('d1', 'Advanced testing topics _ Django documentation _ Django (1).pdf', 'User', '01/09/2023'),
  f('d2', 'Advanced testing topics _ Django documentation _ Django (1).pdf', 'User', '01/09/2023'),
  f('d3', 'New Round Modeler v2.xlsx', 'Steven Hansen', '08/05/2026'),
  f('d4', 'Propuesta Cowbox desarrollo ecommerce shopify - Woobsing 2022.xlsx', 'User', '01/09/2023', 'Financials'),
  f('d5', 'Scalar Landing Page (technology section).pdf', 'Steven Hansen', '02/06/2023', 'Cap Table'),
  f('d6', 'Scalar Marketing Report - April2026.pptx (1).png', 'Steven Hansen', '06/01/2026', 'Presentation of a business strategy or an investment'),
  f('d7', 'Screenshot 2023-02-02 at 5.11.41 PM.png', 'Steven Hansen', '02/06/2023', 'Cap Table'),
  f('d8', 'Screenshot 2026-08-05 at 4.40.50 PM.png', 'Steven Hansen', '08/05/2026'),
  f('d9', 'Screenshot 2026-08-05 at 4.40.50 PM.png', 'Test Steven', '08/05/2026', 'External valuations'),
  f('d10', 'volcano-eruption-2021-08-29-00-10-20-utc.zip', 'Steven Hansen', '02/06/2023'),
];

/**
 * A company's uploaded subfolders. System-generated exports are not here: they
 * moved to Company › Documents › Exports (by origin, so a user-made "Exports"
 * folder holding uploads would stay).
 */
export const subfoldersFor = (_companyName: string): DocFolder[] => [
  {
    id: 'company-docs',
    name: 'Company Docs',
    files: [
      f('c1', 'B&H Invoice.pdf', 'Steven Hansen', '02/06/2023'),
      f('c2', 'OPM and Waterfall.xlsx', 'Steven Hansen', '02/06/2023'),
      f('c3', 'Screenshot 2023-02-02 at 8.52.02 PM.png', 'Steven Hansen', '02/06/2023'),
    ],
  },
];

export interface MeasurementDate {
  date: string;
  documents: number;
  subfolders: number;
  requests: { sent: number; uploaded: number; pending: number };
}

/** Firm-wide measurement-date folders (All Documents). */
export const measurementDates: MeasurementDate[] = [
  { date: '06/30/2026', documents: 43, subfolders: 12, requests: { sent: 21, uploaded: 0, pending: 21 } },
  { date: '05/01/2026', documents: 3, subfolders: 2, requests: { sent: 0, uploaded: 0, pending: 0 } },
  { date: '12/31/2025', documents: 2, subfolders: 2, requests: { sent: 14, uploaded: 0, pending: 14 } },
  { date: '09/30/2025', documents: 10, subfolders: 2, requests: { sent: 7, uploaded: 0, pending: 7 } },
  { date: '03/31/2025', documents: 53, subfolders: 7, requests: { sent: 22, uploaded: 6, pending: 16 } },
];

/** A company's own measurement-date folders (company selected). */
export const companyDates = ['03/31/2025', '06/30/2022', '05/10/2021'];

export const allFilesFor = (companyName: string): DocFile[] => [...rootFiles, ...subfoldersFor(companyName).flatMap((s) => s.files)];
