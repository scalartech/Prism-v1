/**
 * Company · Documents & Requests — the company's information requests, as the
 * signed-in sender sees them. The list itself is the Unified Request Portal's
 * (same model, store and rows); this module adds what only the sender has:
 * who each request was sent to, and the introduction they wrote.
 *
 * Each company's list starts consistent with Firm Valuations' Process
 * Management column: a valuation in progress has the open document requests
 * and questions that column was drawn with (`seedTasksOf`); every other
 * company's request is fully resolved. From then on the column reads the live
 * list (`openTasksOf`), so sending, answering or reopening a request shows there.
 *
 * Prototype-only: everything lives in this browser's localStorage, like the portal.
 */
import { companyById } from '../../data/fixtures.js';
import { seedTasksOf } from '../p03-valuations/data.js';
import { CATEGORIES, FIXTURES, INTRODUCTION, REQUEST_META, seedDueDate } from '../prototypes/request-portal/fixtures.js';
import {
  DOC_EXTENSIONS, isResolved, type InformationRequest, type ResponseType,
} from '../prototypes/request-portal/model.js';
import { appendRequests, peekDueDate, peekRequests } from '../prototypes/request-portal/store.js';

export { CATEGORIES };

/** `empty` starts with nothing sent; every other state starts from the company's seeded request. */
const listOf = (state: string) => (state === 'empty' ? 'empty' : 'default');
// v2: lists are seeded per company from its valuation status.
export const requestsKey = (companyId: string, state = 'default') => `company.v2.${companyId}.${listOf(state)}`;

const QUESTION_TYPES: ResponseType[] = ['text', 'choice', 'multiple_choice', 'date'];
const FILE_TYPES: ResponseType[] = ['file', 'template_file'];
const isQuestion = (r: Pick<InformationRequest, 'responseType'>) => QUESTION_TYPES.includes(r.responseType);

/**
 * A company's request as first sent: every request resolved, then — for a
 * valuation in progress — the open documents and questions reopened, so the
 * list and the Valuations column agree from the start.
 */
/** Days before Oct 27 a company's request went out, so dates differ across the firm (stable per company). */
const sentDaysAgo = (companyId: string) => [...companyId].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7) % 21;
const shiftDay = (iso: string, days: number) => {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return `${d.toISOString().slice(0, 10)}${iso.slice(10)}`;
};
const seedSentAt = (companyId: string) => shiftDay('2026-10-27', -sentDaysAgo(companyId));

function seedRequests(companyId: string): InformationRequest[] {
  // Seeded uploads land a day or so after the company's own send date.
  const lag = 1 - sentDaysAgo(companyId) + (sentDaysAgo(companyId) % 4);
  const every = FIXTURES.standard['all-complete']!().map((r) => (r.files?.length
    ? { ...r, files: r.files.map((f) => ({ ...f, uploadedAt: shiftDay(f.uploadedAt, lag - 1) })) }
    : r));
  const open = seedTasksOf(companyById(companyId));
  if (!open) return every;
  const simple = (r: InformationRequest) => !r.parentId && !every.some((f) => f.parentId === r.id) && r.responseType !== 'multiple_choice';
  const reopen = new Set([
    ...every.filter((r) => simple(r) && FILE_TYPES.includes(r.responseType)).slice(0, open.documents).map((r) => r.id),
    ...every.filter((r) => simple(r) && isQuestion(r)).slice(0, open.questions).map((r) => r.id),
  ]);
  return every.map((r) => (reopen.has(r.id) ? { ...r, status: 'pending', answer: undefined, selection: undefined, files: undefined } : r));
}

export const requestsSeed = (companyId: string, state = 'default') => () => (listOf(state) === 'empty' ? [] : seedRequests(companyId));

/* ---- who each request went to ---- */

export interface SentBatch {
  id: string;
  /** ISO date the batch was sent. */
  sentAt: string;
  recipients: string[];
  requestIds: string[];
}

interface Meta { batches: SentBatch[]; introduction: string[] }

const META_KEY = (companyId: string, state: string) => `scalar.company-requests.v2.${companyId}.${listOf(state)}`;

/** Who the seeded request went to: ABC Co's contact on file, otherwise the company's finance inbox. */
const contactFor = (companyId: string) =>
  companyId === 'abc-co' ? REQUEST_META.respondent : `finance@${companyId.replace(/[^a-z0-9]/g, '')}.com`;

function seedMeta(companyId: string, state: string): Meta {
  const ids = requestsSeed(companyId, state)().map((r) => r.id);
  return {
    batches: ids.length ? [{ id: 'seed', sentAt: seedSentAt(companyId), recipients: [contactFor(companyId)], requestIds: ids }] : [],
    introduction: ids.length ? INTRODUCTION : [],
  };
}

export function loadMeta(companyId: string, state = 'default'): Meta {
  try {
    const raw = window.localStorage.getItem(META_KEY(companyId, state));
    if (raw) return JSON.parse(raw) as Meta;
  } catch { /* storage blocked: start from the seed */ }
  return seedMeta(companyId, state);
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

/**
 * What the builder offers: the portal's response types that need no asset from
 * Scalar. Question types first — Questions folded into Requests, so "Add
 * request" is also how a question is asked.
 */
export const BUILDER_TYPES: ResponseType[] = ['choice', 'text', 'date', 'file'];

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
  const seed = requestsSeed(companyId);
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

/**
 * The builder's "Last request sent to this company": every top-level request
 * already sent, as drafts (template files and multiple choice fall back to the
 * nearest builder type), with the introduction that went with them.
 */
export function lastSentTemplate(companyId: string): { requests: Omit<DraftRequest, 'key'>[]; introduction: string[]; sentAt?: string } {
  const sent = peekRequests(requestsKey(companyId), requestsSeed(companyId)).filter((r) => !r.parentId);
  const meta = loadMeta(companyId);
  return {
    requests: sent.map((r) => ({
      categoryId: r.categoryId,
      title: r.title,
      responseType: BUILDER_TYPES.includes(r.responseType) ? r.responseType : r.responseType === 'multiple_choice' ? 'choice' : 'file',
    })),
    introduction: meta.introduction,
    sentAt: meta.batches.map((b) => b.sentAt).sort().pop(),
  };
}

/* ---- counts: the Requests meter, firm Requests and Valuations ---- */

export interface RequestCounts {
  total: number; resolved: number; pending: number;
  questions: number; questionsAnswered: number;
  /** Open document requests (files and templates). */
  documentsPending: number;
  /** Due date, ISO; undefined when nothing was sent. */
  dueDate?: string;
  /** Last thing that happened, ISO: a request sent, answered or uploaded to. Undefined when nothing was sent. */
  lastActivity?: string;
}

const latest = (isos: (string | undefined)[]) => isos.filter((d): d is string => !!d).sort().pop();

export function requestCounts(companyId: string, state = 'default'): RequestCounts {
  const key = requestsKey(companyId, state);
  const seed = requestsSeed(companyId, state);
  const every = peekRequests(key, seed);
  const all = every.filter((r) => !r.parentId);
  const qs = all.filter(isQuestion);
  const resolved = all.filter((r) => isResolved(r, every)).length;
  return {
    total: all.length,
    resolved,
    pending: all.length - resolved,
    questions: qs.length,
    questionsAnswered: qs.filter((r) => isResolved(r, every)).length,
    documentsPending: all.filter((r) => !isQuestion(r) && !isResolved(r, every)).length,
    dueDate: all.length ? peekDueDate(key, seed) : undefined,
    lastActivity: all.length ? latest([
      ...loadMeta(companyId, state).batches.map((b) => b.sentAt),
      ...every.flatMap((r) => [r.updatedAt, ...(r.files ?? []).map((f) => f.uploadedAt)]),
    ]) : undefined,
  };
}

/** Firm Valuations › Process Management: what the company still owes, from its live request list. */
export function openTasksOf(companyId: string): { documents: number; questions: number } | undefined {
  const c = requestCounts(companyId);
  const questions = c.questions - c.questionsAnswered;
  return c.documentsPending || questions ? { documents: c.documentsPending, questions } : undefined;
}

/** Everyone a company's requests went to. */
export const recipientsFor = (companyId: string, state = 'default') =>
  [...new Set(loadMeta(companyId, state).batches.flatMap((b) => b.recipients))];

export { seedDueDate };
