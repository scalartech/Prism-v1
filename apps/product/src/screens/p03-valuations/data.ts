/**
 * Firm Valuations data, derived from the company database. Headline values
 * are withheld (Not Applicable) until a valuation is published (final or
 * published in the record).
 */
import type { GridCol } from '../p02-intelligence/PortfolioGrid.js';
import { num, pct, usd, type Company } from '../../data/fixtures.js';
import { allocationOf, approachesOf, isPublished } from '../p02-intelligence/data.js';
import { workflowStatusOf } from '../../domain/context.js';

/** The companies drawn in the Valuations frames, in frame order (SpaceX and Perplexity are not in the database). */
export const VALUATIONS_FRAME = [
  'PC Laptops', 'PIK', 'Euros Financials', 'Future 4 Liq Pref', 'ABC Co', 'Fund Owns Preferred Notes', 'jan23',
  'SpaceX', 'Backside Blocks', 'Debt Only', 'Rarestep', 'Cohesity', 'DataBricks', 'Notes Only', 'Perplexity',
];

export const valuationColumns: GridCol[] = [
  { key: 'valDate', label: 'Valuation Date', numeric: true },
  { key: 'process', label: 'Process Management' },
  { key: 'status', label: 'Valuation Status' },
  { key: 'approaches', label: 'Valuation Approaches' },
  { key: 'ev', label: 'Enterprise Value', numeric: true },
  { key: 'eqv', label: 'Equity Value', numeric: true },
  { key: 'breakeven', label: 'Breakeven Exit Equity', numeric: true },
  { key: 'alloc', label: 'Allocation Method' },
  { key: 'cfv', label: 'Current Fund Value', numeric: true },
  { key: 'chg', label: '% Change from Previous', numeric: true },
];

/**
 * The open process-management tasks each company's information request starts
 * with: a valuation still in progress has document requests and questions
 * outstanding; DataBricks carries the pair drawn in the frame. Only the seed —
 * the column itself reads the live request list (`openTasksOf`).
 */
export function seedTasksOf(c: Company): { documents: number; questions: number } | undefined {
  if (c.id === 'databricks') return { documents: 2, questions: 1 };
  if (workflowStatusOf(c) !== 'in-progress') return undefined;
  return { documents: 1 + (c.securities % 3), questions: c.founded % 3 };
}

/** One Valuations row (process and status cells are rendered by the screen). */
export function valuationValues(c: Company): Record<string, string | undefined> {
  if (!isPublished(c)) return { valDate: c.asOf, approaches: '', alloc: '' };
  return {
    valDate: c.asOf,
    approaches: approachesOf(c),
    ev: usd.format(Math.round(c.equityValue * 1.08)),
    eqv: usd.format(c.equityValue),
    breakeven: num.format(Math.round(c.equityValue * 0.6)),
    alloc: allocationOf(c),
    cfv: usd.format(c.fairValue),
    chg: pct((c.moic - 1) * 12, 2),
  };
}
