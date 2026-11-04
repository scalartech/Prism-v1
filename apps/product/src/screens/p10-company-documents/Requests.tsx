/**
 * Company · Requests — the company's information requests as the signed-in
 * sender (Scalar or firm user) sees them: one numbered list of questions and
 * documents, what each recipient has answered or uploaded, and what is still
 * pending. The body is the Unified Request Portal's list (same rows, store and
 * dialogs, viewer = sender); the chrome is the company's three tiers.
 *
 * Tier 3: Documents · Questions · Requests, then Expand, Status, Select All and
 * Bulk actions, the due date and Info Request. The page heading carries progress.
 *
 * Prototype (proto:company-requests): no Figma frames yet. Data lives in this browser.
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Alert, Banner, Button, Checkbox, ContextMenu, EmptyState, FilterDropdown, Icon, MenuDivider, MenuItem, Overline,
  SelectMenu, SelectMenuOption, SubmenuItem, Text, Toast, ToastViewport, color, elevation, icons, radius, space, zIndex,
} from '@scalar/design-system';
import type { ScreenProps } from '../../types.js';
import { companyById } from '../../data/fixtures.js';
import { CompanyLayout } from '../../shell/CompanyLayout.js';
import { byNumber, isResolved, matchesStatus, type RequestStatus, type StatusFilter } from '../prototypes/request-portal/model.js';
import { DelegateDialog, DueDateDialog } from '../prototypes/request-portal/PortalModals.js';
import { RequestRow } from '../prototypes/request-portal/RequestRow.js';
import { usePortalStore } from '../prototypes/request-portal/store.js';
import { CompanyActionsButton, DocumentsSubNav, InfoRequestButton, RequestsHeading, requestsText } from './shared.js';
import { CATEGORIES, loadMeta, recipientsOf, requestsKey, requestsSeed, resetCompanyRequests } from './requestData.js';

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'completed', label: 'Completed' },
];

/** Set by New Info Request just before it navigates here, read once. */
export const SENT_NOTE_KEY = 'scalar.company-requests.sent';

const fmt = (iso: string) => { const [y, m, d] = iso.split('-'); return `${m}/${d}/${y}`; };

interface ToastItem { id: number; tone: 'positive' | 'negative' | 'info'; text: string; action?: { label: string; onClick: () => void } }

export function Requests({ state, params }: ScreenProps) {
  const company = companyById(params.companyId);
  const seed = useMemo(() => requestsSeed(state), [state]);
  const store = usePortalStore(requestsKey(company.id, state), seed);
  const [meta, setMeta] = useState(() => loadMeta(company.id, state));
  const [category, setCategory] = useState<string>('all');
  const [recipient, setRecipient] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(state === 'pending' ? 'pending' : 'all');
  const [statusMenu, setStatusMenu] = useState(false);
  const [expandMenu, setExpandMenu] = useState(false);
  const [bulkMenu, setBulkMenu] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [introOpen, setIntroOpen] = useState(true);
  const [dialog, setDialog] = useState<'due-date' | 'delegate' | null>(null);
  const [delegateIds, setDelegateIds] = useState<string[]>([]);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [sentNote, setSentNote] = useState<string | null>(null);

  // The confirmation New Info Request leaves behind, shown once.
  useEffect(() => {
    try {
      const note = window.sessionStorage.getItem(SENT_NOTE_KEY);
      if (note) { setSentNote(note); window.sessionStorage.removeItem(SENT_NOTE_KEY); }
    } catch { /* storage blocked */ }
  }, []);

  const dropToast = (id: number) => setToasts((t) => t.filter((x) => x.id !== id));
  const notify = (tone: ToastItem['tone'], text: string, action?: ToastItem['action']) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, tone, text, action }]);
    window.setTimeout(() => dropToast(id), action ? 10_000 : 4500);
  };

  /* ---- one derived model for every count ---- */
  const every = store.requests;
  const all = useMemo(() => every.filter((r) => !r.parentId).sort(byNumber), [every]);
  const done = (r: (typeof all)[number]) => isResolved(r, every);
  const total = all.length;
  const resolvedCount = all.filter(done).length;
  const counts = { total, resolved: resolvedCount, pending: total - resolvedCount };
  const recipients = [...new Set(meta.batches.flatMap((b) => b.recipients))];
  const forRecipient = (r: (typeof all)[number]) => recipient === 'all' || recipientsOf(meta, r).includes(recipient);
  const visible = all.filter((r) => (category === 'all' || r.categoryId === category) && forRecipient(r) && matchesStatus(r, statusFilter, every));
  const visibleIds = visible.map((r) => r.id);
  const categoriesInUse = CATEGORIES.filter((c) => all.some((r) => r.categoryId === c.id));

  // Selection never outlives the filter that showed it.
  const visibleKey = visibleIds.join('|');
  useEffect(() => {
    const shown = new Set(visibleKey.split('|'));
    setSelected((s) => { const next = new Set([...s].filter((id) => shown.has(id))); return next.size === s.size ? s : next; });
  }, [visibleKey]);

  const selectedVisible = visible.filter((r) => selected.has(r.id));
  const allChecked = visible.length > 0 && selectedVisible.length === visible.length;
  const someChecked = selectedVisible.length > 0 && !allChecked;
  const toggleSel = (id: string, on: boolean) => setSelected((s) => { const n = new Set(s); if (on) n.add(id); else n.delete(id); return n; });
  const toggleExp = (id: string) => setExpanded((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  /* ---- bulk actions: selected ∩ visible ∩ eligible ---- */
  const pendingSel = selectedVisible.filter((r) => r.status === 'pending').map((r) => r.id);
  const resolvedSel = selectedVisible.filter((r) => r.status !== 'pending').map((r) => r.id);
  const bulkStatus = (status: RequestStatus) => {
    store.setStatus(pendingSel, status);
    notify('info', `${pendingSel.length} request${pendingSel.length === 1 ? '' : 's'} marked ${status === 'na' ? 'not applicable' : 'complete — sent another way'}.`);
    setSelected(new Set()); setBulkMenu(false);
  };
  const bulkReopen = () => {
    store.reopen(resolvedSel);
    notify('info', `${resolvedSel.length} request${resolvedSel.length === 1 ? '' : 's'} reopened.`);
    setSelected(new Set()); setBulkMenu(false);
  };
  const openDelegate = (ids: string[]) => { setDelegateIds(ids); setDialog('delegate'); setBulkMenu(false); };
  const clearFilters = () => { setCategory('all'); setRecipient('all'); setStatusFilter('all'); };
  const resetAll = () => {
    store.reset();
    resetCompanyRequests(company.id, state);
    setMeta(loadMeta(company.id, state));
    setSelected(new Set()); setExpanded(new Set()); clearFilters();
    notify('info', 'Prototype data reset.');
  };
  const statusText = STATUS_OPTIONS.find((o) => o.value === statusFilter)!.label;

  /* ---- tier 3 tools ---- */
  const tools = (
    <>
      <div style={{ position: 'relative' }}>
        <Button size="xs" variant="tertiary" disabled={!visible.length} aria-haspopup="menu" aria-expanded={expandMenu}
          leadingIcon={<Icon size="s" tone="inherit"><icons.UnfoldMore /></Icon>}
          trailingIcon={<Icon size="s" tone="inherit"><icons.ArrowDropDown /></Icon>} onClick={() => setExpandMenu((o) => !o)}>
          Expand
        </Button>
        {expandMenu && visible.length > 0 && (
          <div style={{ position: 'absolute', top: '100%', right: 0, zIndex: zIndex.overlay, marginTop: space.xs, boxShadow: elevation.overlay }}>
            {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
            <ContextMenu label="Expand or collapse requests" autoFocus onClose={() => setExpandMenu(false)}>
              <MenuItem onClick={() => { setExpanded(new Set(visibleIds)); setExpandMenu(false); }} icon={<Icon size="s" tone="inherit"><icons.UnfoldMore /></Icon>}>
                Expand all
              </MenuItem>
              <MenuItem onClick={() => { setExpanded(new Set(visible.filter((r) => !done(r)).map((r) => r.id))); setExpandMenu(false); }} icon={<Icon size="s" tone="inherit"><icons.Schedule /></Icon>}>
                {`Expand all pending (${visible.filter((r) => !done(r)).length})`}
              </MenuItem>
              <MenuItem onClick={() => { setExpanded(new Set()); setExpandMenu(false); }} icon={<Icon size="s" tone="inherit"><icons.UnfoldLess /></Icon>}>
                Collapse all
              </MenuItem>
            </ContextMenu>
          </div>
        )}
      </div>
      <div style={{ position: 'relative' }}>
        <FilterDropdown label="Status" expanded={statusMenu} aria-haspopup="listbox" onClick={() => setStatusMenu((o) => !o)}>
          {statusText}
        </FilterDropdown>
        {statusMenu && (
          <div style={{ position: 'absolute', top: '100%', right: 0, zIndex: zIndex.overlay, marginTop: space.xs }}>
            <SelectMenu label="Status" onEscape={() => setStatusMenu(false)}>
              {STATUS_OPTIONS.map((o) => (
                <SelectMenuOption key={o.value} selected={o.value === statusFilter} onSelect={() => { setStatusFilter(o.value); setStatusMenu(false); }}>
                  {o.label}
                </SelectMenuOption>
              ))}
            </SelectMenu>
          </div>
        )}
      </div>
      <Checkbox size="s" checked={allChecked} indeterminate={someChecked} disabled={visible.length === 0}
        onChange={() => setSelected(allChecked ? new Set() : new Set(visibleIds))}>
        <Text as="span" step="s" style={{ whiteSpace: 'nowrap' }}>{selectedVisible.length ? `${selectedVisible.length} selected` : 'Select All'}</Text>
      </Checkbox>
      <div style={{ position: 'relative' }}>
        <Button size="xs" variant="secondary" disabled={!selectedVisible.length} aria-haspopup="menu" aria-expanded={bulkMenu}
          trailingIcon={<Icon size="s" tone="inherit"><icons.ArrowDropDown /></Icon>} onClick={() => setBulkMenu((o) => !o)}>
          Bulk actions
        </Button>
        {bulkMenu && selectedVisible.length > 0 && (
          <div style={{ position: 'absolute', top: '100%', right: 0, zIndex: zIndex.overlay, marginTop: space.xs, boxShadow: elevation.overlay }}>
            {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
            <ContextMenu label="Bulk actions" autoFocus onClose={() => setBulkMenu(false)}>
              <MenuItem disabled={!pendingSel.length} onClick={() => bulkStatus('na')} icon={<Icon size="s" tone="inherit"><icons.DoNotDisturbOn /></Icon>}>
                {`Mark as not applicable (${pendingSel.length})`}
              </MenuItem>
              <MenuItem disabled={!pendingSel.length} onClick={() => bulkStatus('sent')} icon={<Icon size="s" tone="inherit"><icons.Send /></Icon>}>
                {`Mark complete – sent another way (${pendingSel.length})`}
              </MenuItem>
              <MenuItem disabled={!resolvedSel.length} onClick={bulkReopen} icon={<Icon size="s" tone="inherit"><icons.Undo /></Icon>}>
                {`Reopen (${resolvedSel.length})`}
              </MenuItem>
              <MenuDivider />
              <MenuItem onClick={() => openDelegate(selectedVisible.map((r) => r.id))} icon={<Icon size="s" tone="inherit"><icons.PersonAdd /></Icon>}>
                {`Delegate (${selectedVisible.length})`}
              </MenuItem>
            </ContextMenu>
          </div>
        )}
      </div>
      {total > 0 && (
        // The sender sets the due date (an action, so a Button).
        <Button size="xs" variant="secondary" leadingIcon={<Icon size="s" tone="inherit"><icons.EditCalendar /></Icon>} onClick={() => setDialog('due-date')}
          aria-label={`Due ${fmt(store.dueDate)}. Change due date`}>
          Due {fmt(store.dueDate)}
        </Button>
      )}
      <InfoRequestButton companyId={company.id} />
    </>
  );

  /* ---- left column: categories, then who it went to ---- */
  const tally = (doneN: number, of: number) => (
    <Text as="span" step="s" tone={of > 0 && doneN === of ? 'positive' : 'secondary'}>
      {doneN}/{of}<span className="scalar-visually-hidden"> resolved</span>
    </Text>
  );
  const row = (label: ReactNode, right: ReactNode) => (
    <span style={{ display: 'flex', justifyContent: 'space-between', gap: space.s, width: '100%' }}>
      <span style={{ whiteSpace: 'nowrap' }}>{label}</span>{right}
    </span>
  );
  const aside = (
    <aside style={{ alignSelf: 'start', display: 'flex', flexDirection: 'column', border: `1px solid ${color.stroke.default}`, borderRadius: radius.s, background: color.bg.surface }}>
      <nav aria-label="Categories" style={{ display: 'flex', flexDirection: 'column', gap: space['2xs'], padding: space.s }}>
        <Overline as="h2" style={{ padding: `${space.xs} ${space.s}` }}>Categories</Overline>
        {meta.introduction.length > 0 && <SubmenuItem onClick={() => { setCategory('all'); setIntroOpen(true); }}>Introduction</SubmenuItem>}
        <SubmenuItem current={category === 'all'} onClick={() => setCategory('all')}>{row('All requests', tally(resolvedCount, total))}</SubmenuItem>
        {categoriesInUse.map((c) => {
          const items = all.filter((r) => r.categoryId === c.id);
          return (
            <SubmenuItem key={c.id} current={category === c.id} onClick={() => setCategory(c.id)}>
              {row(`${c.order}. ${c.name}`, tally(items.filter(done).length, items.length))}
            </SubmenuItem>
          );
        })}
      </nav>
      {recipients.length > 0 && (
        <nav aria-label="Sent to" style={{ display: 'flex', flexDirection: 'column', gap: space['2xs'], padding: space.s, borderTop: `1px solid ${color.stroke.divider}` }}>
          <Overline as="h2" style={{ padding: `${space.xs} ${space.s}` }}>Sent to</Overline>
          <SubmenuItem current={recipient === 'all'} onClick={() => setRecipient('all')}>{row('Everyone', <Text as="span" step="s" tone="secondary">{counts.pending} pending</Text>)}</SubmenuItem>
          {recipients.map((name) => {
            const theirs = all.filter((r) => recipientsOf(meta, r).includes(name));
            const pending = theirs.filter((r) => !done(r)).length;
            return (
              <SubmenuItem key={name} current={recipient === name} onClick={() => setRecipient(name)}>
                {row(name, <Text as="span" step="s" tone={pending ? 'secondary' : 'positive'}>{pending ? `${pending} pending` : 'All resolved'}</Text>)}
              </SubmenuItem>
            );
          })}
        </nav>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: space.s, padding: space.m, borderTop: `1px solid ${color.stroke.divider}` }}>
        <Text step="s" tone="secondary">Prototype: requests and responses are kept in this browser only.</Text>
        <div><Button size="s" variant="tertiary" onClick={resetAll}>Reset prototype data</Button></div>
      </div>
    </aside>
  );

  const introduction = meta.introduction.length > 0 && introOpen && category === 'all' && (
    <div style={{ padding: space.m, borderBottom: `1px solid ${color.stroke.divider}` }}>
      <Alert tone="info" title="Introduction sent with this request" onDismiss={() => setIntroOpen(false)} dismissLabel="Dismiss introduction">
        <div style={{ display: 'flex', flexDirection: 'column', gap: space.s }}>
          {meta.introduction.map((p) => <Text as="p" key={p} step="m" style={{ margin: 0 }}>{p.replace('{company}', company.name).replace('{sender}', 'Scalar')}</Text>)}
        </div>
      </Alert>
    </div>
  );

  const list = total === 0 ? (
    <EmptyState
      type="no-data"
      title="No requests sent yet"
      body={`Send ${company.name} an information request to collect documents and answers. Each request shows here, with what has come back and what is still pending.`}
      icon={<icons.Inbox />}
    />
  ) : visible.length === 0 ? (
    <EmptyState
      type="no-results"
      title={statusFilter === 'pending' ? 'Nothing pending' : 'No requests match these filters'}
      body={`Showing ${statusText.toLowerCase()} requests${recipient === 'all' ? '' : ` sent to ${recipient}`}${category === 'all' ? '' : ` in ${CATEGORIES.find((c) => c.id === category)?.name}`}.`}
      icon={<icons.FilterAlt />}
      actions={<Button variant="secondary" size="s" onClick={clearFilters}>Clear filters</Button>}
    />
  ) : (
    <ul aria-label="Requests" style={{ margin: 0, padding: 0 }}>
      {visible.map((r, i) => {
        const header = category === 'all' && (i === 0 || visible[i - 1]!.categoryId !== r.categoryId);
        const cat = CATEGORIES.find((c) => c.id === r.categoryId)!;
        return (
          <RowWithHeader key={r.id} header={header ? `${cat.order}. ${cat.name}` : undefined}>
            <RequestRow
              req={r}
              all={every}
              expanded={expanded.has(r.id)}
              onToggle={() => toggleExp(r.id)}
              selected={selected.has(r.id)}
              onSelect={(on) => toggleSel(r.id, on)}
              store={store}
              onDelegate={(id) => openDelegate([id])}
              notify={notify}
              mobile={false}
            />
          </RowWithHeader>
        );
      })}
    </ul>
  );

  return (
    <CompanyLayout
      company={company}
      section="documents"
      date={company.asOf}
      headerEnd={<CompanyActionsButton />}
      subNav={<DocumentsSubNav companyId={company.id} current="requests" />}
      subNavEnd={tools}
      dock={false}
      overlay={
        <>
          <ToastViewport aria-label="Notifications">
            {toasts.map((t) => (
              <Toast key={t.id} tone={t.tone} onDismiss={() => dropToast(t.id)}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: space.s, flexWrap: 'wrap' }}>
                  {t.text}
                  {t.action && <Button variant="tertiary" size="xs" onClick={() => { t.action!.onClick(); dropToast(t.id); }}>{t.action.label}</Button>}
                </span>
              </Toast>
            ))}
          </ToastViewport>
          <DueDateDialog
            open={dialog === 'due-date'}
            onClose={() => setDialog(null)}
            dueDate={store.dueDate}
            onSave={(iso) => { store.setDueDate(iso); notify('positive', `Due date changed to ${fmt(iso)}.`); }}
          />
          <DelegateDialog
            open={dialog === 'delegate'}
            onClose={() => setDialog(null)}
            count={delegateIds.length}
            onSubmit={async (email) => { await store.delegate(delegateIds, email); notify('positive', `Delegated to ${email}.`); setSelected(new Set()); }}
          />
        </>
      }
    >
      <RequestsHeading
        companyId={company.id}
        title="Requests"
        counts={{ done: resolvedCount, total, label: 'Information requests resolved', text: requestsText(counts) }}
      />

      {sentNote && (
        <Banner tone="positive" title="Information request sent" onDismiss={() => setSentNote(null)}>{sentNote}</Banner>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(min-content, 1fr) minmax(0, 4fr)', gap: space.l, alignItems: 'start' }}>
        {aside}
        <section aria-label="Requests" style={{ minWidth: 0, border: `1px solid ${color.stroke.default}`, borderRadius: radius.s, background: color.bg.surface }}>
          {total > 0 && counts.pending === 0 && (
            <div style={{ padding: space.m }}>
              <Banner tone="positive" title="Every request is resolved">{`${company.name} has responded to every request.`}</Banner>
            </div>
          )}
          {introduction}
          {list}
        </section>
      </div>
    </CompanyLayout>
  );
}

function RowWithHeader({ header, children }: { header?: string; children: ReactNode }) {
  return (
    <>
      {header && (
        <li style={{ listStyle: 'none', padding: `${space.s} ${space.m} ${space.xs}`, background: color.bg.subtle, borderBottom: `1px solid ${color.stroke.divider}` }}>
          <Overline>{header}</Overline>
        </li>
      )}
      {children}
    </>
  );
}
