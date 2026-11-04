/** Demo content for Company · Documents & Requests, copied from the Figma frames. */

export interface CompanyDoc {
  id: string;
  name: string;
  /** Extension, for the File Type Badge. */
  ext: string;
  source: string;
  uploaded: string;
  reference: string;
}

/** The frame's document list, keyed to the company (its financials export carries its name). */
export const companyDocsFor = (companyName: string): CompanyDoc[] => [
  { id: '1', name: 'Scalar - SOC 1 Type 1 Report (Draft) (2)', ext: 'docx', source: 'Steven Hansen', uploaded: '01/06/2026', reference: 'Financials' },
  { id: '2', name: `${companyName}_Financials_5388_2025-03-31`, ext: 'xlsx', source: 'Steven Hansen', uploaded: '01/06/2026', reference: 'Financials' },
  { id: '3', name: 'IT Process and Components - Client questionnaire', ext: 'xlsx', source: 'Steven Hansen', uploaded: '01/06/2026', reference: 'Financials' },
  { id: '4', name: 'Scalar - SOC 1 Type 1 Report (Draft) (1)', ext: 'docx', source: 'Steven Hansen', uploaded: '01/06/2026', reference: 'Financials' },
  { id: '5', name: 'Screenshot 2025-12-19 at 4.44.59 PM', ext: 'png', source: 'Steven Hansen', uploaded: '01/06/2026', reference: 'Financials' },
  { id: '6', name: 'GPC Rights issue and acquistion of Manglier workings v12', ext: 'xlsx', source: 'Steven Hansen', uploaded: '11/24/2025', reference: 'Cap Table (…)' },
];

export const exportDocsFor = (companyName: string, asOfIso: string): CompanyDoc[] => [
  { id: 'x1', name: `${companyName}_Financials_${asOfIso}`, ext: 'xlsx', source: 'Scalar', uploaded: '01/06/2026', reference: 'Financials' },
];

export const defaultDocumentRequests = [
  'Presentation of a business strategy or an investment',
  'Competitors and similar companies',
  'Balance sheet and income statement',
  'Financial projections',
  'Cap table',
  'Restated Certificate of Incorporation',
  'External valuations',
];

export const defaultQuestions = [
  'When is the projected exit for the company?',
  'What is the projected exit amount (based on last year’s valuation)?',
  'Should we assume progress for the company is up, flat, or down?',
  'Have their been any secondary or other equity transactions recently?',
  'Has the company received any acquisitions offers?',
  'How much was the most recent round and when did it occur?',
  'Is the company in the process of fundraising?',
  'When does the company hope to raise its next round?',
  'Have there been any significant changes to the company or business model since the previous round?',
  'Has anything else occurred that could materially impact the valuation of the company?',
];

export const responsibles = [
  { id: 'r1', name: 'Test Steven' },
  { id: 'r2', name: 'Gabriel Cánepa' },
  { id: 'r3', name: 'Steven hansen' },
  { id: 'r4', name: 'Steven Hansen' },
  { id: 'r5', name: 'Spatical Auditor' },
  { id: 'r6', name: 'Test Steven', detail: 'second contact' },
  { id: 'r7', name: 'Tenable Tester' },
  { id: 'r8', name: 'bayardo Martinez' },
];

/**
 * The same starting list, filed into the request categories with the response
 * each one asks for (the request builder starts from it). Wording is unchanged.
 */
export const defaultDrafts: Array<{ title: string; categoryId: string; responseType: 'file' | 'text' | 'choice' | 'date' }> = [
  { title: defaultDocumentRequests[5]!, categoryId: 'corporate', responseType: 'file' },
  { title: defaultQuestions[8]!, categoryId: 'corporate', responseType: 'text' },
  { title: defaultDocumentRequests[4]!, categoryId: 'capitalization', responseType: 'file' },
  { title: defaultQuestions[3]!, categoryId: 'capitalization', responseType: 'choice' },
  { title: defaultQuestions[5]!, categoryId: 'capitalization', responseType: 'text' },
  { title: defaultQuestions[6]!, categoryId: 'capitalization', responseType: 'choice' },
  { title: defaultQuestions[7]!, categoryId: 'capitalization', responseType: 'date' },
  { title: defaultDocumentRequests[2]!, categoryId: 'financials', responseType: 'file' },
  { title: defaultDocumentRequests[3]!, categoryId: 'projections', responseType: 'file' },
  { title: defaultQuestions[2]!, categoryId: 'projections', responseType: 'text' },
  { title: defaultDocumentRequests[1]!, categoryId: 'customers', responseType: 'file' },
  { title: defaultDocumentRequests[6]!, categoryId: 'transactions', responseType: 'file' },
  { title: defaultQuestions[0]!, categoryId: 'transactions', responseType: 'date' },
  { title: defaultQuestions[1]!, categoryId: 'transactions', responseType: 'text' },
  { title: defaultQuestions[4]!, categoryId: 'transactions', responseType: 'choice' },
  { title: defaultDocumentRequests[0]!, categoryId: 'other', responseType: 'file' },
  { title: defaultQuestions[9]!, categoryId: 'other', responseType: 'text' },
];
