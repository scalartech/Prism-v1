/**
 * Documents (firm) › Requests — list + detail (Round 2 §1). A firm admin picks
 * a company on the left and answers or uploads its requests on the right,
 * without leaving the page: the right pane is the company Requests tab's own
 * workspace (`useRequestsWorkspace`: introduction, numbered categories, inline
 * answers, Yes / No, upload, template, N/A, Delegate), so every fix there
 * lands here too.
 *
 * Left: one company list — search, Fund, "With pending only" (on by default),
 * the count line; rows show the pending count, pending first, then the nearest
 * due date, then name. ↑/↓ move the selection. Right: the company name and
 * "Open company" (the only way into company context), the request tools
 * (meter, Expand, Status, Select All, Bulk actions, due date), then the list.
 * When the last pending request is resolved, the pane offers the next company.
 *
 * `#/documents/requests` selects the first company with pending requests;
 * `#/documents/requests/:companyId` deep-links one. Search, filters, the
 * selection and the list's scroll survive Back (sessionStorage).
 *
 * Row 2 holds the tabs (All documents · Requests) in place of a title; on this
 * tab nothing else sits there beyond the pin and ⋮ — the request tools act on
 * one company, so they live in the right pane.
 *
 * Prototype (proto:firm-requests): no Figma frames yet.
 */
import { useEffect, useMemo, useState } from 'react';
import { Badge, Heading, Icon, Link, Switch, Text, color, icons, space } from '@scalar/design-system';
import type { ScreenProps } from '../../types.js';
import { href } from '../../router.js';
import { routes } from '../../routes.js';
import { AppFrame, scrollBody } from '../../shell/AppFrame.js';
import { PageHeader } from '../../shell/PageHeader.js';
import { ToolbarKebab } from '../../shell/Toolbar.js';
import { requestCounts } from '../p10-company-documents/requestData.js';
import { useRequestsWorkspace } from '../p10-company-documents/Requests.js';
import { docCompanies } from './data.js';
import { CompanyListPanel, FilterSelect, columnPanel, firmDocsTabs } from './parts.js';

interface View { query: string; fund: string; pendingOnly: boolean }

const DEFAULT_VIEW: View = { query: '', fund: 'all', pendingOnly: true };
/** Kept for the session, so Back finds the page as it was left. */
const VIEW_KEY = 'scalar.firm-requests.view.v2';

function loadView(): View {
  try { const raw = window.sessionStorage.getItem(VIEW_KEY); if (raw) return { ...DEFAULT_VIEW, ...JSON.parse(raw) as View }; } catch { /* default */ }
  return DEFAULT_VIEW;
}

export function FirmRequests({ state, params }: ScreenProps) {
  const [view, setView] = useState<View>(loadView);
  useEffect(() => { try { window.sessionStorage.setItem(VIEW_KEY, JSON.stringify(view)); } catch { /* ignore */ } }, [view]);
  const set = (patch: Partial<View>) => setView((v) => ({ ...v, ...patch }));

  const companies = useMemo(() => docCompanies(), []);
  const [selectedId, setSelectedId] = useState<string | undefined>(params.companyId);
  // Counts read every company's stored list; refresh them when the open company's change.
  const [tick, setTick] = useState(0);
  const counted = useMemo(
    () => companies.map((c) => ({ c, n: requestCounts(c.id) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [companies, tick],
  );
  const ordered = useMemo(() => [...counted].sort((a, b) =>
    b.n.pending - a.n.pending
    || (a.n.dueDate ?? '9999').localeCompare(b.n.dueDate ?? '9999')
    || a.c.name.localeCompare(b.c.name)), [counted]);

  // No company in the URL: the first one with something pending.
  const current = selectedId ?? ordered.find((r) => r.n.pending > 0)?.c.id ?? ordered[0]?.c.id;
  const select = (id: string) => {
    setSelectedId(id);
    // The address follows the selection (shareable, survives reload) without a navigation.
    window.history.replaceState(null, '', href(routes.firmDocuments.request(id)));
  };
  const next = ordered.find((r) => r.n.pending > 0 && r.c.id !== current);
  const w = useRequestsWorkspace(current, state, { firm: true, onNextCompany: next ? () => select(next.c.id) : undefined });
  const live = `${w.counts.pending}/${w.counts.resolved}/${w.counts.total}`;
  useEffect(() => setTick((t) => t + 1), [live]);

  const funds = [...new Set(companies.map((c) => c.fund).filter((f): f is string => !!f))].sort();
  const q = view.query.trim().toLowerCase();
  const rows = ordered.filter(({ c, n }) => (!q || c.name.toLowerCase().includes(q))
    && (view.fund === 'all' || c.fund === view.fund)
    && (!view.pendingOnly || n.pending > 0 || c.id === current));
  const withPending = counted.filter((r) => r.n.pending > 0).length;

  return (
    <AppFrame area="documents" date="03/31/2025" overlay={w.overlay}>
      <PageHeader title={<span className="scalar-visually-hidden">Documents — Requests</span>} tabs={firmDocsTabs} current="requests" trailing={<ToolbarKebab />} />
      <main style={{ ...scrollBody, display: 'flex', gap: space.l, padding: space.l, alignItems: 'stretch' }}>
        <CompanyListPanel
          label="Companies"
          rows={rows.map(({ c, n }) => ({
            company: c,
            end: n.pending
              ? <Badge aria-label={`${n.pending} pending`}>{n.pending}</Badge>
              : <Icon size="s" tone="positive" label={n.total ? 'All resolved' : 'No requests sent'}>{n.total ? <icons.CheckCircle /> : <icons.Remove />}</Icon>,
          }))}
          selectedId={current}
          onSelect={select}
          query={view.query}
          onQueryChange={(query) => set({ query })}
          filters={
            <>
              <FilterSelect label="Fund" value={view.fund} onChange={(fund) => set({ fund })}
                options={[{ value: 'all', label: 'All funds' }, ...funds.map((f) => ({ value: f, label: f }))]} />
              <Switch size="s" checked={view.pendingOnly} onChange={(e) => set({ pendingOnly: e.currentTarget.checked })}>
                <Text as="span" step="s">With pending only</Text>
              </Switch>
            </>
          }
          summary={`${rows.length} of ${companies.length} companies · ${withPending} with requests pending`}
        />

        <section aria-label={`${w.company.name} requests`} style={{ ...columnPanel, flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: space.m }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: space.m, flexWrap: 'wrap' }}>
            <Heading level={2} step="m">{w.company.name}</Heading>
            <Link href={href(routes.company.requests(w.company.id))} size="s">Open company</Link>
          </div>
          <div role="toolbar" aria-label={`${w.company.name} request tools`}
            style={{ display: 'flex', alignItems: 'center', gap: space.s, flexWrap: 'wrap', paddingBottom: space.s, borderBottom: `1px solid ${color.stroke.divider}` }}>
            {w.tools}
          </div>
          {w.content}
        </section>
      </main>
    </AppFrame>
  );
}
