/**
 * PROTOTYPE-ONLY Express mode matcher. It stands in for the AI service, so it is
 * deterministic: the same files and text always give the same suggestions, and
 * a demo never surprises anyone. Swap it for the API call; the dialog only uses
 * `analyze`.
 *
 * It only ever SUGGESTS. Nothing here saves or completes a request (G3.7): the
 * recipient reviews every suggestion, and applying goes through the store's
 * normal save lifecycle.
 */
import { fileExtension, requestNumber, type InformationRequest } from './model.js';

export type Confidence = 'strong' | 'check';

export interface FileSuggestion {
  key: string;
  file: File;
  /** `null`: nothing matched; the file goes to Unsorted unless the recipient picks a request. */
  requestId: string | null;
  confidence: Confidence | null;
}

export interface AnswerSuggestion {
  key: string;
  requestId: string;
  /** text, 'yes' / 'no', an ISO date, or a multiple-choice option id. */
  value: string;
  /** The pasted sentence the answer came from, shown so the recipient can check it. */
  quote: string;
  confidence: Confidence;
}

/* ---- files: filename keywords, per request ---- */

/** A keyword is one token, or several that must all appear. Weight 2 is distinctive; 1 only supports. */
type Keyword = [terms: string, weight: 1 | 2];

const FILE_KEYWORDS: Record<string, Keyword[]> = {
  // 409A
  'v-101': [['historical', 2], ['annual', 2], ['audited', 2], ['fy2023', 1], ['fy2024', 1], ['fy2025', 1], ['income', 1], ['balance', 1], ['financials', 1]],
  'v-102': [['ltm', 2], ['ttm', 2], ['last twelve', 2], ['trailing', 2], ['income', 1], ['balance', 1], ['is', 1], ['bs', 1]],
  'v-103': [['budget', 2], ['next year', 2], ['fy2027', 2], ['forecast', 1]],
  'v-104': [['5yr', 2], ['5 year', 2], ['five year', 2], ['long range', 2], ['projection', 1], ['projections', 1], ['model', 1]],
  'v-201': [['cap table', 2], ['captable', 2], ['carta', 2], ['options', 1]],
  'v-202': [['certificate incorporation', 2], ['charter', 2], ['restated', 2], ['operating agreement', 2], ['coi', 2]],
  'v-203': [['safe', 2], ['safes', 2], ['convertible', 2], ['notes', 1], ['ledger', 1]],
  'v-301': [['pitch', 2], ['deck', 2], ['investor presentation', 2]],
  'v-302': [['competitors', 2], ['competitor', 2], ['comparables', 2], ['comps', 2], ['peers', 2], ['landscape', 1]],
  'v-303': [['409a', 2], ['valuation', 2], ['appraisal', 2], ['opinion', 1]],
  // Standard (PPA / ASC 820)
  'r-101': [['certificate incorporation', 2], ['charter', 2], ['restated', 2]],
  'r-103': [['board', 2], ['composition', 2], ['directors', 2]],
  'r-201': [['cap table', 2], ['captable', 2], ['carta', 2], ['fully diluted', 2]],
  'r-202': [['options', 2], ['warrants', 2], ['grants', 1]],
  'r-301': [['fy2025', 2], ['audited', 2], ['financial statements', 2], ['balance', 1], ['income', 1]],
  'r-302': [['monthly', 2], ['24 months', 2], ['kpis', 1]],
  'r-401': [['projections', 2], ['forecast', 2], ['fy2026', 1], ['fy2030', 1], ['model', 1]],
  'r-501': [['customers', 2], ['concentration', 2], ['top 20', 2], ['ttm', 1]],
  'r-502': [['subscription agreement', 2], ['msa', 2], ['customer contract', 2], ['master', 1]],
  'r-601': [['loan', 2], ['credit agreement', 2], ['debt', 1]],
  'r-701': [['litigation', 2], ['claims', 2], ['legal matters', 2]],
  'r-802': [['term sheet', 2], ['loi', 2]],
  'r-902': [['strategy', 2], ['presentation', 1]],
};

const tokens = (name: string) =>
  name.replace(/\.[^.]+$/, '').toLowerCase().replace(/([a-z])(\d)/g, '$1 $2').split(/[^a-z0-9]+/).filter(Boolean)
    // "FY2025" is kept whole as well as split, so both spellings match.
    .concat(name.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean));

function scoreFile(name: string, req: InformationRequest): number {
  const have = new Set(tokens(name));
  return (FILE_KEYWORDS[req.id] ?? []).reduce((sum, [terms, w]) => (terms.split(' ').every((t) => have.has(t)) ? sum + w : sum), 0);
}

const accepts = (req: InformationRequest, file: File) =>
  !req.allowedExtensions || req.allowedExtensions.includes(fileExtension(file.name));

/* ---- pasted text: one rule per question ---- */

interface AnswerRule {
  /** The sentence that answers this request. */
  find: RegExp;
  /** choice: a sentence matching `no` answers No; otherwise Yes. */
  no?: RegExp;
  /** multiple_choice: option id → words that pick it. */
  options?: Record<string, RegExp>;
}

const NEG = /\b(no|not|none|never|haven't|hasn't|didn't|isn't)\b/i;

const ANSWER_RULES: Record<string, AnswerRule> = {
  // 409A
  'v-401': { find: /secondar(y|ies)/i, no: NEG },
  'v-402': { find: /term sheet|loi\b|letter of intent|(debt|equity) (financing|raise|round|facility)|in process/i, no: /\bno (term sheets?|pending|transactions?)\b|not (received|in process)/i },
  // Standard
  'r-102': { find: /(legal )?name|domicile/i, no: NEG },
  'r-104': { find: /gaap|ifrs/i, options: { 'us-gaap': /gaap/i, ifrs: /ifrs/i } },
  'r-203': { find: /secondar(y|ies)/i },
  'r-303': { find: /audit/i },
  'r-402': { find: /trending|growing|grew|flat|declin|progress/i },
  'r-403': { find: /(next|series [a-z]) (round|raise)|raise (our|the|a)/i },
  'r-503': { find: /churn/i, no: NEG },
  'r-602': { find: /venture debt|matur/i },
  'r-603': { find: /off[- ]balance/i },
  'r-702': { find: /investigation|regulator/i, no: NEG },
  'r-801': { find: /acquisition offer|indication of interest|offer to acquire|approached/i },
  'r-803': { find: /exit/i },
  'r-901': { find: /material/i },
};

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const iso = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

/** MM/DD/YYYY, YYYY-MM-DD, "March 14, 2026" or "March 2027" (the 1st). */
export function findDate(sentence: string): string | null {
  let m = sentence.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  if (m) return iso(+m[3]!, +m[1]!, +m[2]!);
  m = sentence.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (m) return iso(+m[1]!, +m[2]!, +m[3]!);
  m = sentence.match(new RegExp(`\\b(${MONTHS.join('|')})\\s+(?:(\\d{1,2}),?\\s+)?(\\d{4})\\b`, 'i'));
  if (m) return iso(+m[3]!, MONTHS.indexOf(m[1]!.toLowerCase()) + 1, m[2] ? +m[2] : 1);
  return null;
}

const sentences = (text: string) => text.split(/(?<=[.!?])\s+|\n+/).map((s) => s.trim()).filter(Boolean);

function answerFor(req: InformationRequest, rule: AnswerRule, sentence: string): string | null {
  switch (req.responseType) {
    case 'choice': return rule.no?.test(sentence) ? 'no' : 'yes';
    case 'date': return findDate(sentence);
    case 'text': return sentence;
    case 'multiple_choice': {
      const hit = Object.entries(rule.options ?? {}).find(([id, re]) => re.test(sentence) && req.choice?.options.some((o) => o.id === id));
      return hit ? hit[0] : null;
    }
    default: return null;
  }
}

/* ---- the one call the dialog makes ---- */

export const FILE_TYPES = new Set(['file', 'template_file']);

export function analyze(files: readonly File[], text: string, requests: readonly InformationRequest[]) {
  // Only open requests, and never a follow-up: a follow-up appears once its parent's answer calls for it.
  const open = requests.filter((r) => r.status === 'pending' && !r.parentId);
  const fileTargets = open.filter((r) => FILE_TYPES.has(r.responseType));

  const fileSuggestions: FileSuggestion[] = files.flatMap((file, i): FileSuggestion[] => {
    const scored = fileTargets
      .filter((r) => accepts(r, file))
      .map((r) => ({ r, score: scoreFile(file.name, r) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || a.r.categoryOrder - b.r.categoryOrder || a.r.requestOrder - b.r.requestOrder);
    if (!scored.length) return [{ key: `f${i}`, file, requestId: null, confidence: null }];
    const best = scored[0]!;
    // One file can answer several requests (a financial package covering 1.1 and 1.2): every strong match is offered.
    const strong = scored.filter((x) => x.score >= 2);
    const picks = strong.length > 1 ? strong.filter((x) => x.score >= best.score - 1) : [best];
    return picks.map((x, j) => ({ key: `f${i}-${j}`, file, requestId: x.r.id, confidence: (x.score >= 2 ? 'strong' : 'check') as Confidence }));
  });

  const answerSuggestions: AnswerSuggestion[] = [];
  const said = sentences(text);
  for (const req of open) {
    const rule = ANSWER_RULES[req.id];
    if (!rule || FILE_TYPES.has(req.responseType)) continue;
    const sentence = said.find((s) => rule.find.test(s));
    if (!sentence) continue;
    const value = answerFor(req, rule, sentence);
    if (value) answerSuggestions.push({ key: `a-${req.id}`, requestId: req.id, value, quote: sentence, confidence: req.responseType === 'text' ? 'check' : 'strong' });
  }
  return { fileSuggestions, answerSuggestions };
}

export const requestLabel = (r: InformationRequest) => `${requestNumber(r)} ${r.title}`;

/* ---- prototype sample content, so a demo needs no real files ---- */

const SAMPLE_FILES: Record<'standard' | '409a', string[]> = {
  '409a': [
    'ABC_Co_Financials_FY2023-FY2025_audited.xlsx',
    'ABC_Co_LTM_June_2026_IS_BS.xlsx',
    'FY2027_budget.xlsx',
    'ABC_5yr_projection_model.xlsx',
    'Cap_Table_Carta_06-30-2026.xlsx',
    'Restated_Certificate_of_Incorporation.pdf',
    'SAFE_ledger_and_agreements.pdf',
    'ABC_Co_Investor_Deck_2026.pptx',
    'Market_landscape.pdf',
    'Board_minutes_Q2_2026.pdf',
  ],
  standard: [
    'Restated_Certificate_of_Incorporation.pdf',
    'Cap_Table_fully_diluted_06-30-2026.xlsx',
    'Options_Warrants_Schedule.xlsx',
    'FY2025_Audited_Financial_Statements.pdf',
    'Monthly_KPIs_24_months.xlsx',
    'Projections_FY2026-FY2030.xlsx',
    'Top_20_customers_TTM.csv',
    'Master_Subscription_Agreement.docx',
    'Strategy_presentation_2026.pptx',
    'Board_minutes_Q2_2026.pdf',
  ],
};

const SAMPLE_TEXT: Record<'standard' | '409a', string> = {
  '409a': 'There have been no secondary transactions in company stock. We signed a term sheet for a $5M venture debt facility in September 2026, expected to close in Q4.',
  standard: [
    'The company has not changed its legal name or domicile.',
    'We report under US GAAP.',
    'The most recent audited statements are dated 03/31/2026.',
    'Business is trending up: ARR grew 38% year over year.',
    'We plan to raise our Series C round in March 2027.',
    'No customer above 5% of revenue churned in the last 12 months.',
    'The venture debt facility matures on 12/31/2028.',
    'The company is not subject to any regulatory investigation.',
  ].join(' '),
};

const MIME: Record<string, string> = {
  pdf: 'application/pdf', csv: 'text/csv', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};

export function sampleContent(set: 'standard' | '409a') {
  const files = SAMPLE_FILES[set].map((name) => new File([`Prototype sample file: ${name}`], name, { type: MIME[fileExtension(name)] ?? '' }));
  return { files, text: SAMPLE_TEXT[set] };
}
