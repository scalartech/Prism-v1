/**
 * Demo content for the Unified Request Portal: information requests for
 * report date 06/30/2026 (the engagement label comes from the scenario). Order is defined here (`categoryOrder`,
 * `requestOrder`), never by array position.
 */
import { DOC_EXTENSIONS, SHEET_EXTENSIONS, type Category, type InformationRequest, type TemplateAsset } from './model.js';

export const REQUEST_META = {
  reportDate: '06/30/2026',
  firm: 'Spatical Ventures',
  company: 'ABC Co',
  analyst: 'Steven Hansen',
  respondent: 'Maria López',
};

/**
 * Optional instructions the analyst writes for the whole request. Shown as the
 * "Introduction" item above the categories; `{company}` and `{sender}` are
 * filled in. A request without one has no Introduction item.
 */
export const INTRODUCTION = [
  'To ensure a timely and accurate completion of the valuation for {company}, {sender} requires specific financial, operational, and structural information.',
  'We kindly request that you review and provide the following documents, as well as responses to the accompanying questions, at your earliest convenience.',
  'To facilitate our quantitative analysis, please provide all financial statements, capitalization tables, and data schedules in Microsoft Excel format, wherever applicable, rather than as static PDFs.',
];

/**
 * The request's due date as the server would send it. The prototype seeds it a
 * week out the first time a fixture loads and then keeps the stored value, so
 * a responder sees "7 days remaining" on first open.
 */
export function seedDueDate(today = new Date()): string {
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const CATEGORIES: Category[] = [
  { id: 'corporate', order: 1, name: 'Corporate & Legal' },
  { id: 'capitalization', order: 2, name: 'Capitalization' },
  { id: 'financials', order: 3, name: 'Financial Statements' },
  { id: 'projections', order: 4, name: 'Projections & Budget' },
  { id: 'customers', order: 5, name: 'Customers & Revenue' },
  { id: 'debt', order: 6, name: 'Debt & Commitments' },
  { id: 'litigation', order: 7, name: 'Litigation & Claims' },
  { id: 'transactions', order: 8, name: 'Transactions & Offers' },
  { id: 'other', order: 9, name: 'Other' },
];

const tpl = (id: string, name: string, file: string, version: string): TemplateAsset => ({
  id, name, version, issued: '09/15/2026', fileName: file, mimeType: 'text/csv', path: `./assets/templates/${file}`,
});

export const TEMPLATES = {
  options: tpl('tpl-options', 'Options & Warrants Schedule', 'options-warrants-schedule-v2.csv', '2.1'),
  monthly: tpl('tpl-monthly', 'Monthly Financial Performance', 'monthly-financial-performance-v3.csv', '3.0'),
  customers: tpl('tpl-customers', 'Customer Concentration Schedule', 'customer-concentration-v1.csv', '1.2'),
  litigation: tpl('tpl-litigation', 'Litigation & Claims Schedule', 'litigation-claims-schedule-v1.csv', '1.0'),
  /** Points at an asset that does not exist, to show the unavailable-template state. */
  missing: tpl('tpl-board', 'Board Composition Template', 'board-composition-v1.csv', '1.0'),
};

type Seed = Omit<InformationRequest, 'categoryOrder' | 'status'> & { status?: InformationRequest['status'] };

const doc = { allowedExtensions: DOC_EXTENSIONS };
const sheet = { allowedExtensions: SHEET_EXTENSIONS };

const SEEDS: Seed[] = [
  { id: 'r-101', categoryId: 'corporate', requestOrder: 1, title: 'Restated Certificate of Incorporation', details: 'The current certificate with all amendments, as filed.', responseType: 'file', ...doc },
  { id: 'r-102', categoryId: 'corporate', requestOrder: 2, title: 'Has the company changed its legal name or domicile since the last valuation?', responseType: 'choice' },
  { id: 'r-103', categoryId: 'corporate', requestOrder: 3, title: 'Board composition as of the report date', details: 'Use the template so seats and observers are listed the same way each period.', responseType: 'template_file', template: TEMPLATES.missing, ...sheet },
  {
    id: 'r-104', categoryId: 'corporate', requestOrder: 4, title: 'Which accounting standard does the company report under?',
    responseType: 'multiple_choice',
    choice: { mode: 'single', options: [
      { id: 'us-gaap', label: 'US GAAP' }, { id: 'ifrs', label: 'IFRS' }, { id: 'other', label: 'Other', other: true },
    ] },
  },
  {
    id: 'r-104f', parentId: 'r-104', showWhen: ['ifrs'], categoryId: 'corporate', requestOrder: 4,
    title: 'When did the company adopt IFRS?', responseType: 'date',
  },
  { id: 'r-201', categoryId: 'capitalization', requestOrder: 1, title: 'Fully diluted cap table as of 06/30/2026', details: 'Include every class, option pool and convertible instrument.', responseType: 'file', ...doc },
  { id: 'r-202', categoryId: 'capitalization', requestOrder: 2, title: 'Options and warrants schedule', details: 'Complete the template with one row per grant.', responseType: 'template_file', template: TEMPLATES.options, ...sheet },
  { id: 'r-203', categoryId: 'capitalization', requestOrder: 3, title: 'Have there been any secondary or other equity transactions recently?', details: 'Describe the date, price per share, class and parties.', responseType: 'text' },
  { id: 'r-204', categoryId: 'capitalization', requestOrder: 4, title: 'How much was the most recent round and when did it close?', responseType: 'text', status: 'complete', answer: 'Series B, $18.5M, closed 03/14/2026 at $4.12 per share.' },
  { id: 'r-301', categoryId: 'financials', requestOrder: 1, title: 'Balance sheet and income statement for FY2025', details: 'Audited if available; otherwise management accounts.', responseType: 'file', ...doc },
  { id: 'r-302', categoryId: 'financials', requestOrder: 2, title: 'Monthly financial performance, last 24 months', details: 'Revenue, gross profit, EBITDA and cash, per the template.', responseType: 'template_file', template: TEMPLATES.monthly, ...sheet },
  { id: 'r-303', categoryId: 'financials', requestOrder: 3, title: 'Date of the most recent audited financial statements', responseType: 'date' },
  { id: 'r-304', categoryId: 'financials', requestOrder: 4, title: 'Are the FY2025 financials audited?', responseType: 'choice', status: 'complete', answer: 'yes' },
  { id: 'r-401', categoryId: 'projections', requestOrder: 1, title: 'Financial projections for FY2026–FY2030', details: 'Management’s current base case, with assumptions.', responseType: 'file', ...doc },
  { id: 'r-402', categoryId: 'projections', requestOrder: 2, title: 'Should we assume progress for the company is up, flat, or down?', responseType: 'text' },
  { id: 'r-403', categoryId: 'projections', requestOrder: 3, title: 'When does the company hope to raise its next round?', responseType: 'date' },
  { id: 'r-501', categoryId: 'customers', requestOrder: 1, title: 'Customer concentration schedule', details: 'Top 20 customers by trailing-12-month revenue.', responseType: 'template_file', template: TEMPLATES.customers, ...sheet },
  { id: 'r-502', categoryId: 'customers', requestOrder: 2, title: 'Can you share the standard customer contract?', details: 'Upload the current master subscription agreement. A written answer is not needed.', responseType: 'file', ...doc },
  { id: 'r-503', categoryId: 'customers', requestOrder: 3, title: 'Did any customer above 5% of revenue churn in the last 12 months?', responseType: 'choice' },
  { id: 'r-601', categoryId: 'debt', requestOrder: 1, title: 'Loan agreements and amendments', responseType: 'file', ...doc, status: 'sent' },
  { id: 'r-602', categoryId: 'debt', requestOrder: 2, title: 'Maturity date of the venture debt facility', responseType: 'date' },
  { id: 'r-603', categoryId: 'debt', requestOrder: 3, title: 'Describe any off-balance-sheet commitments', responseType: 'text' },
  { id: 'r-701', categoryId: 'litigation', requestOrder: 1, title: 'Litigation and claims schedule', details: 'Every pending, threatened or recently settled matter.', responseType: 'template_file', template: TEMPLATES.litigation, ...sheet },
  { id: 'r-702', categoryId: 'litigation', requestOrder: 2, title: 'Is the company subject to any regulatory investigation?', responseType: 'choice' },
  { id: 'r-801', categoryId: 'transactions', requestOrder: 1, title: 'Has the company received any acquisition offers?', details: 'Include indications of interest and term sheets, even if declined.', responseType: 'text' },
  { id: 'r-802', categoryId: 'transactions', requestOrder: 2, title: 'Term sheet for the most recent offer', responseType: 'file', ...doc, status: 'na' },
  { id: 'r-803', categoryId: 'transactions', requestOrder: 3, title: 'When is the projected exit for the company?', responseType: 'date' },
  {
    id: 'r-804', categoryId: 'transactions', requestOrder: 4, title: 'Which of these events occurred since the last valuation?',
    shortNote: 'Select all that apply.', responseType: 'multiple_choice',
    choice: { mode: 'multiple', options: [
      { id: 'acquisition', label: 'Acquisition of another company' },
      { id: 'financing', label: 'New financing round' },
      { id: 'executive', label: 'Departure of a key executive' },
      { id: 'restructuring', label: 'Restructuring or layoffs' },
      { id: 'other', label: 'Other', other: true },
    ] },
  },
  {
    id: 'r-804f', parentId: 'r-804', showWhen: ['acquisition'], categoryId: 'transactions', requestOrder: 4,
    title: 'Upload the acquisition agreement', details: 'The signed purchase agreement, with schedules.', responseType: 'file', ...doc,
  },
  { id: 'r-901', categoryId: 'other', requestOrder: 1, title: 'Has anything else occurred that could materially impact the valuation?', responseType: 'text' },
  // Answered by a delegate: shows a long uploader name in the file row.
  {
    id: 'r-902', categoryId: 'other', requestOrder: 2, title: 'Presentation of the business strategy', shortNote: 'The latest board or investor version.',
    responseType: 'file', ...doc, status: 'complete', delegatee: 'alexandra.montgomery-whitfield@abcco.com',
    files: [{
      id: 'seed-strategy', requestId: 'r-902', name: 'ABC_Co_Strategy_Board_Presentation_FY2026_Q3_FINAL_v3.pptx',
      mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', sizeBytes: 4_812_000,
      uploadedAt: '2026-10-28T15:04:00.000Z', uploadedBy: 'Alexandra Montgomery-Whitfield, Assistant Controller', version: 1,
    }],
  },
];

/** A 409A request: twelve requests in four categories, to show a short list. */
export const CATEGORIES_409A: Category[] = [
  { id: 'v-financials', order: 1, name: 'Financials' },
  { id: 'v-cap-table', order: 2, name: 'Cap Table' },
  { id: 'v-other', order: 3, name: 'Other' },
  { id: 'v-questions', order: 4, name: 'Questions' },
];

const SEEDS_409A: Seed[] = [
  { id: 'v-101', categoryId: 'v-financials', requestOrder: 1, title: 'Historical annual income statements and year-end balance sheets', shortNote: 'For the past three fiscal years, if available.', details: 'One file per fiscal year, or a single file with all three.', responseType: 'file', ...doc, maxFiles: 3 },
  { id: 'v-102', categoryId: 'v-financials', requestOrder: 2, title: 'Last twelve months income statement and balance sheet', shortNote: 'As of the valuation date.', responseType: 'file', ...doc },
  { id: 'v-103', categoryId: 'v-financials', requestOrder: 3, title: 'Next year financial projections', responseType: 'file', ...doc },
  { id: 'v-104', categoryId: 'v-financials', requestOrder: 4, title: 'Next 3–5 year financial projections', shortNote: 'If available.', responseType: 'file', ...doc },
  { id: 'v-201', categoryId: 'v-cap-table', requestOrder: 1, title: 'Cap table', details: 'As of the valuation date, including outstanding options and warrants with their strike prices.', responseType: 'file', ...doc },
  { id: 'v-202', categoryId: 'v-cap-table', requestOrder: 2, title: 'Amended and Restated Certificate of Incorporation or Operating Agreement', details: 'Or another document detailing the economic rights and preferences of each class of equity.', responseType: 'file', ...doc },
  { id: 'v-203', categoryId: 'v-cap-table', requestOrder: 3, title: 'Convertible note / SAFE ledger and agreements', shortNote: 'If applicable.', details: 'The ledger plus each signed note or SAFE. Up to 10 files.', responseType: 'file', ...doc, maxFiles: 10 },
  { id: 'v-301', categoryId: 'v-other', requestOrder: 1, title: 'Latest company pitch deck', shortNote: 'If available.', responseType: 'file', ...doc },
  { id: 'v-302', categoryId: 'v-other', requestOrder: 2, title: 'A list of competitors and comparable firms', shortNote: 'If available.', responseType: 'file', ...doc },
  { id: 'v-303', categoryId: 'v-other', requestOrder: 3, title: 'Any previous valuation opinions', shortNote: 'If available.', responseType: 'file', ...doc },
  { id: 'v-401', categoryId: 'v-questions', requestOrder: 1, title: 'Has the company had any secondary transactions?', responseType: 'choice' },
  { id: 'v-402', categoryId: 'v-questions', requestOrder: 2, title: 'Has the company received any term sheets, or does it have any potential debt or equity transactions in process?', shortNote: 'Include letters of intent.', responseType: 'choice' },
];

const orderOf = (categoryId: string) => [...CATEGORIES, ...CATEGORIES_409A].find((c) => c.id === categoryId)!.order;

const build = (seeds: Seed[]): InformationRequest[] =>
  seeds.map((s) => ({ ...s, categoryOrder: orderOf(s.categoryId), status: s.status ?? 'pending' }));

/** Keep the requests that pass, with the follow-ups of every parent that passes. */
const pickFrom = (SEEDS: Seed[]) => (test: (s: Seed) => boolean) => {
  const parents = SEEDS.filter((s) => !s.parentId && test(s));
  const ids = new Set(parents.map((s) => s.id));
  return build(SEEDS.filter((s) => ids.has(s.id) || (s.parentId !== undefined && ids.has(s.parentId))));
};

/** The fixture sets each screen state loads (P2.2). Same list component for all of them. */
const fixtures = (SEEDS: Seed[]): Record<string, () => InformationRequest[]> => {
  const pick = pickFrom(SEEDS);
  return {
    default: () => build(SEEDS),
    'questions-only': () => pick((s) => ['text', 'choice', 'multiple_choice', 'date'].includes(s.responseType)),
    'documents-only': () => pick((s) => s.responseType === 'file'),
    'templates-only': () => pick((s) => s.responseType === 'template_file'),
    // File requests resolve as "sent another way" here: no file exists, so none is implied (P0.8).
    'all-complete': () => build(SEEDS).map((r) => {
      if (r.status !== 'pending') return r;
      if (r.responseType === 'file' || r.responseType === 'template_file') return { ...r, status: 'sent' };
      if (r.responseType === 'multiple_choice') return { ...r, status: 'complete', selection: { optionIds: [r.choice!.options[0]!.id] } };
      const answer = r.responseType === 'choice' ? 'no' : r.responseType === 'date' ? '2026-06-30' : 'Answered in the call on 10/20/2026.';
      return { ...r, status: 'complete', answer };
    }),
    empty: () => [],
  };
};

/** Which request list a scenario loads: the full PPA-style list, or the short 409A one. */
export type RequestSet = 'standard' | '409a';
export const FIXTURES: Record<RequestSet, Record<string, () => InformationRequest[]>> = {
  standard: fixtures(SEEDS),
  '409a': fixtures(SEEDS_409A),
};
export const CATEGORIES_FOR: Record<RequestSet, Category[]> = { standard: CATEGORIES, '409a': CATEGORIES_409A };

/**
 * A fund admin answers the same request for several companies. Each company has
 * its own list and progress: the first starts fresh, the second part-way, the
 * third fully resolved.
 */
export function seedFor(state: string, companyIndex: number, set: RequestSet = 'standard'): InformationRequest[] {
  const sets = FIXTURES[set];
  const base = (sets[state] ?? sets.default!)();
  if (companyIndex === 0) return base;
  if (companyIndex === 1) return base.map((r, i) => (r.status === 'pending' && !r.parentId && i % 3 === 0 ? { ...r, status: 'sent' } : r));
  return (sets['all-complete']!)().filter((r) => base.some((b) => b.id === r.id));
}
