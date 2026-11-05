/**
 * Documents (firm) › Requests — every company's information request in one
 * full-width table: pending, resolved / total, due date and last activity,
 * pending first. Search, fund and status filters sit above it. Picking a
 * company opens it in company context (Company › Documents › Requests), where
 * its list, tools and builder live; Back returns here with the search,
 * filters, sort and scroll position as they were.
 *
 * Row 2 holds the tabs (All documents · Requests) in place of a title, so there
 * is no third nav row. Questions folded into Requests; the old Questions and
 * company-picked routes redirect (routes.ts › redirectOf).
 *
 * Every figure reads the same live list as the company page (`requestCounts`).
 *
 * Prototype (proto:firm-requests): no Figma frames yet.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Cell, Chip, ColumnHeader, DataGrid, EmptyState, Icon, Input, Row, RowHeader, Text, icons, space,
} from '@scalar/design-system';
import type { ScreenProps } from '../../types.js';
import { href } from '../../router.js';
import { routes } from '../../routes.js';
import { AppFrame, scrollBody } from '../../shell/AppFrame.js';
import { PageHeader } from '../../shell/PageHeader.js';
import { ToolbarKebab } from '../../shell/Toolbar.js';
import { ABSENCE_LABEL } from '../../domain/display.js';
import { formatDay } from '../prototypes/request-portal/model.js';
import { requestCounts } from '../p10-company-documents/requestData.js';
import { docCompanies } from './data.js';
import { FilterSelect, firmDocsTabs } from './parts.js';

type Status = 'all' | 'pending' | 'resolved' | 'none';
type SortKey = 'company' | 'pending' | 'due' | 'activity';
interface View { query: string; fund: string; status: Status; sort: { key: SortKey; dir: 'asc' | 'desc' } }

const DEFAULT_VIEW: View = { query: '', fund: 'all', status: 'all', sort: { key: 'pending', dir: 'desc' } };
/** Kept for the session, so Back from a company finds the page as it was left. */
const VIEW_KEY = 'scalar.firm-requests.view';
const SCROLL_KEY = 'scalar.firm-requests.scroll';

const STATUS_OPTIONS: { value: Status; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'resolved', label: 'All resolved' },
  { value: 'none', label: 'None sent' },
];

function loadView(): View {
  try { const raw = window.sessionStorage.getItem(VIEW_KEY); if (raw) return { ...DEFAULT_VIEW, ...JSON.parse(raw) as View }; } catch { /* default */ }
  return DEFAULT_VIEW;
}

const day = (iso?: string) => (iso ? formatDay(iso) : ABSENCE_LABEL['not-entered']);

export function FirmRequests(_props: ScreenProps) {
  const [view, setView] = useState<View>(loadView);
  const body = useRef<HTMLElement>(null);
  useEffect(() => { try { window.sessionStorage.setItem(VIEW_KEY, JSON.stringify(view)); } catch { /* ignore */ } }, [view]);
  // Back from a company puts the list where it was.
  useLayoutEffect(() => {
    try { const y = Number(window.sessionStorage.getItem(SCROLL_KEY)); if (y && body.current) body.current.scrollTop = y; } catch { /* ignore */ }
  }, []);
  const set = (patch: Partial<View>) => setView((v) => ({ ...v, ...patch }));

  const all = useMemo(() => docCompanies().map((c) => ({ c, n: requestCounts(c.id) })), []);
  const funds = [...new Set(all.map((r) => r.c.fund).filter((f): f is string => !!f))].sort();
  const q = view.query.trim().toLowerCase();
  const statusOf = (n: (typeof all)[number]['n']): Status => (n.total === 0 ? 'none' : n.pending ? 'pending' : 'resolved');

  const rows = all
    .filter(({ c, n }) => (!q || c.name.toLowerCase().includes(q))
      && (view.fund === 'all' || c.fund === view.fund)
      && (view.status === 'all' || statusOf(n) === view.status))
    .sort((a, b) => {
      const { key, dir } = view.sort;
      const sign = dir === 'asc' ? 1 : -1;
      const due = (x: typeof a) => x.n.dueDate ?? '9999';
      const by = key === 'company' ? a.c.name.localeCompare(b.c.name)
        : key === 'due' ? due(a).localeCompare(due(b))
          : key === 'activity' ? (a.n.lastActivity ?? '').localeCompare(b.n.lastActivity ?? '')
            : a.n.pending - b.n.pending;
      // Ties: the default reading — pending first, then the earliest due date.
      return sign * by || b.n.pending - a.n.pending || due(a).localeCompare(due(b)) || a.c.name.localeCompare(b.c.name);
    });

  const sortProps = (key: SortKey) => ({
    sort: view.sort.key === key ? view.sort.dir : null,
    onSortChange: (dir: 'asc' | 'desc') => set({ sort: { key, dir } }),
  });
  const pendingCompanies = all.filter((r) => r.n.pending > 0).length;

  return (
    <AppFrame area="documents" date="03/31/2025">
      <PageHeader title={<span className="scalar-visually-hidden">Documents — Requests</span>} tabs={firmDocsTabs} current="requests" trailing={<ToolbarKebab />} />
      <main
        ref={body}
        onScroll={(e) => { try { window.sessionStorage.setItem(SCROLL_KEY, String(e.currentTarget.scrollTop)); } catch { /* ignore */ } }}
        style={{ ...scrollBody, padding: space.l, display: 'flex', flexDirection: 'column', gap: space.m }}
      >
        <div role="toolbar" aria-label="Find companies" style={{ display: 'flex', alignItems: 'center', gap: space.s, flexWrap: 'wrap' }}>
          <div style={{ width: '22vw' }}>
            <Input
              aria-label="Find company"
              placeholder="Find company"
              value={view.query}
              onChange={(e) => set({ query: e.target.value })}
              leadingIcon={<Icon size="s" tone="secondary"><icons.Search /></Icon>}
            />
          </div>
          <FilterSelect label="Fund" value={view.fund} onChange={(fund) => set({ fund })}
            options={[{ value: 'all', label: 'All funds' }, ...funds.map((f) => ({ value: f, label: f }))]} />
          <FilterSelect label="Status" value={view.status} onChange={(status) => set({ status })} options={STATUS_OPTIONS} />
          <Text as="span" step="s" tone="secondary" style={{ marginLeft: 'auto' }}>
            {`${rows.length} of ${all.length} companies · ${pendingCompanies} with requests pending`}
          </Text>
        </div>

        {rows.length === 0 ? (
          <EmptyState
            type="no-results"
            title="No companies match"
            body="Clear the search or the filters to see every company."
            icon={<Icon size="xl" tone="secondary"><icons.FilterAlt /></Icon>}
          />
        ) : (
          <DataGrid
            label="Information requests by company"
            head={
              <>
                <ColumnHeader grow={3} {...sortProps('company')}>Company</ColumnHeader>
                <ColumnHeader>Fund</ColumnHeader>
                <ColumnHeader numeric {...sortProps('pending')}>Pending</ColumnHeader>
                <ColumnHeader numeric>Resolved / total</ColumnHeader>
                <ColumnHeader {...sortProps('due')}>Due date</ColumnHeader>
                <ColumnHeader {...sortProps('activity')}>Last activity</ColumnHeader>
              </>
            }
          >
            {rows.map(({ c, n }, i) => (
              <Row key={c.id} zebra={i % 2 === 1}>
                <RowHeader href={href(routes.company.requests(c.id))}>{c.name}</RowHeader>
                <Cell>{c.fund ? <Chip size="s">{c.fund}</Chip> : <Text as="span" step="s" tone="tertiary">{ABSENCE_LABEL['not-entered']}</Text>}</Cell>
                <Cell numeric>
                  {n.total === 0
                    ? <Text as="span" step="s" tone="tertiary">None sent</Text>
                    : n.pending
                      ? <Text as="span" step="s" weight="semiBold">{n.pending}</Text>
                      : <Text as="span" step="s" tone="positive">All resolved</Text>}
                </Cell>
                <Cell numeric>{n.total ? `${n.resolved} / ${n.total}` : ABSENCE_LABEL['not-entered']}</Cell>
                <Cell>{n.total ? day(n.dueDate) : ABSENCE_LABEL['not-entered']}</Cell>
                <Cell>{day(n.lastActivity)}</Cell>
              </Row>
            ))}
          </DataGrid>
        )}
      </main>
    </AppFrame>
  );
}
