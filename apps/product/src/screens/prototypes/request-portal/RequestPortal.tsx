/**
 * Unified Request Portal (prototype) — the external contact's page for a PPA
 * information request. Brief: Unified Request Portal, built on main @ 9c2526d.
 *
 * One ordered list of requests — questions and documents together (G2.1). The
 * category column filters it; it is never a second list. Navigation is the
 * three tiers of PageTemplate: Login (1) · Information Request, help links and
 * progress (2) · engagement, status filter, Select All and bulk actions (3).
 *
 * Every count — the ring, "N remaining", the category tallies, the filters —
 * derives from the same `requests` array (P1.3). Bulk actions act only on
 * requests that are selected AND visible AND eligible (P1.1, P1.2).
 *
 * Persistence and uploads go through a labelled prototype adapter (store.ts).
 *
 * Prototype switches (scenario.ts, kept in the URL): who sent the request
 * (Scalar → company, Scalar → fund admin, firm → portfolio company), who is
 * looking (the responder, or the sender's own user, who may change the due
 * date), and whether the link has expired (then only ExpiredLink shows, until
 * the recipient logs in).
 */
import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type ReactNode } from 'react';
import {
  Alert, Avatar, Banner, Button, FileRow, Checkbox, CompanyDropdown, CompanyDropdownPanel, CompanyInfo, ContextMenu, EmptyState, FilterDropdown,
  FormField, Icon, InformationLabel, MainMenuItem, MenuDivider, MenuItem, Notification, Overline, PageTemplate, PrimaryMenu, ProgressBar,
  Radio, RadioGroup, ScalarProvider, SecondaryMenu, SecondaryMenuItem, SegmentedControl, Select, SelectMenu, SelectMenuOption,
  SubmenuItem, TertiaryMenu, Text, Toast, ToastViewport, ToolSwitch, breakpoint, color, elevation, icons, radius, size, space, zIndex,
  glyphs, type ToolSwitchValue,
} from '@scalar/design-system';
import type { ScreenProps } from '../../../types.js';
import { ExpiredLink } from './ExpiredLink.js';
import { AI_BUTTON_STYLE, ExpressModeDialog, type ExpressPlan } from './ExpressMode.js';
import { CATEGORIES_FOR, INTRODUCTION, REQUEST_META, seedFor } from './fixtures.js';
import { byNumber, formatBytes, isResolved, matchesStatus, requestNumber, type RequestStatus, type StatusFilter } from './model.js';
import {
  ContactDialog, DelegateDialog, DueDateDialog, HelpDialog, LoginDialog, PrivacyDialog, type PortalDialog,
} from './PortalModals.js';
import { RequestRow } from './RequestRow.js';
import { SCENARIOS, SCENARIO_IDS, usePrototypeConfig, type LinkState, type Viewer } from './scenario.js';
import { peekRequests, usePortalStore } from './store.js';

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'completed', label: 'Completed' },
];

const fmt = (iso: string) => { const [y, m, d] = iso.split('-'); return `${m}/${d}/${y}`; };

/** Whole days from today to an ISO date (negative when past). */
function daysUntil(iso: string, today = new Date()) {
  const [y, m, d] = iso.split('-').map(Number);
  const due = Date.UTC(y!, m! - 1, d!);
  const now = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((due - now) / 86_400_000);
}

/** What a responder sees instead of the date: words, with tone as a second signal (R8). */
function dueWords(days: number): { text: string; tone: 'secondary' | 'warning' | 'negative' } {
  if (days < 0) return { text: `Overdue by ${-days} day${days === -1 ? '' : 's'}`, tone: 'negative' };
  if (days === 0) return { text: 'Due today', tone: 'warning' };
  return { text: `${days} day${days === 1 ? '' : 's'} remaining`, tone: days <= 2 ? 'warning' : 'secondary' };
}

const storeKey = (state: string, scenario: string, companyId: string) => `${state}.${scenario}.${companyId}`;

function useMobile() {
  const q = `(max-width: ${breakpoint.tabletSmall - 1}px)`;
  const [mobile, setMobile] = useState(() => window.matchMedia(q).matches);
  useEffect(() => {
    const m = window.matchMedia(q);
    const on = () => setMobile(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, [q]);
  return mobile;
}

interface ToastItem { id: number; tone: 'positive' | 'negative' | 'info'; text: string; action?: { label: string; onClick: () => void } }

export function RequestPortal({ state }: ScreenProps) {
  const [config, setConfig] = usePrototypeConfig();
  const scenario = SCENARIOS[config.scenario];
  const multiCompany = scenario.companies.length > 1;
  const [companyId, setCompanyId] = useState(scenario.companies[0]!.id);
  const companyIndex = Math.max(0, scenario.companies.findIndex((c) => c.id === companyId));
  const company = scenario.companies[companyIndex]!;
  // A company from another scenario never carries over.
  useEffect(() => { setCompanyId(SCENARIOS[config.scenario].companies[0]!.id); }, [config.scenario]);
  const requestSet = scenario.requestSet;
  const CATEGORIES = CATEGORIES_FOR[requestSet];
  const seed = useCallback(() => seedFor(state, companyIndex, requestSet), [state, companyIndex, requestSet]);
  const store = usePortalStore(storeKey(state, scenario.id, company.id), seed);
  const [loggedIn, setLoggedIn] = useState<string | null>(null);
  const [companyMenu, setCompanyMenu] = useState(false);
  // The sender's own user (Scalar or firm) is signed in to the platform, so an expired link never stops them.
  const isSender = config.viewer === 'sender';
  const [tool, setTool] = useState<ToolSwitchValue>('valuations');
  // An expired link shows nothing of the request until the recipient logs in.
  const expired = config.link === 'expired' && !loggedIn && !isSender;
  const mobile = useMobile();
  // The analyst's instructions sit above All requests, with the list. Dismissing hides them; "Introduction" in the nav brings them back.
  const intro = INTRODUCTION.map((p) => p.replace('{company}', company.name).replace('{sender}', scenario.senderName));
  const [introOpen, setIntroOpen] = useState(true);
  const [category, setCategory] = useState<string>('all');
  const showIntro = () => { setCategory('all'); setIntroOpen(true); };
  const [expandMenu, setExpandMenu] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [statusMenu, setStatusMenu] = useState(false);
  const [bulkMenu, setBulkMenu] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [dialog, setDialog] = useState<PortalDialog>(null);
  const [delegateIds, setDelegateIds] = useState<string[]>([]);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastId = useRef(0);
  // Express mode: files dropped on the list open it with those files already added.
  const [express, setExpress] = useState<{ open: boolean; files: File[] }>({ open: false, files: [] });
  const [dragging, setDragging] = useState(false);

  const dropToast = (id: number) => setToasts((t) => t.filter((x) => x.id !== id));
  /** A toast with an action (Undo) stays longer, so there is time to reach it (WCAG 2.2.1). */
  const notify = (tone: ToastItem['tone'], text: string, action?: ToastItem['action']) => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, tone, text, action }]);
    window.setTimeout(() => dropToast(id), action ? 10_000 : 4500);
  };

  /* ---- one derived model for every count (P1.3) ---- */
  // Follow-ups live inside their parent: they are never rows and never counted on their own.
  const every = store.requests;
  const all = useMemo(() => store.requests.filter((r) => !r.parentId).sort(byNumber), [store.requests]);
  const done = (r: (typeof all)[number]) => isResolved(r, every);
  const total = all.length;
  const resolvedCount = all.filter(done).length;
  const remaining = total - resolvedCount;
  const visible = all.filter((r) => (category === 'all' || r.categoryId === category) && matchesStatus(r, statusFilter, every));
  const visibleIds = visible.map((r) => r.id);
  const categoriesInUse = CATEGORIES.filter((c) => all.some((r) => r.categoryId === c.id));

  // Selection never outlives the filter that showed it (P1.1).
  const visibleKey = visibleIds.join('|');
  useEffect(() => {
    const shown = new Set(visibleKey.split('|'));
    setSelected((s) => {
      const next = new Set([...s].filter((id) => shown.has(id)));
      return next.size === s.size ? s : next;
    });
  }, [visibleKey]);

  // A different company's (or scenario's) list starts with nothing selected or open.
  useEffect(() => { setSelected(new Set()); setExpanded(new Set()); setCategory('all'); setIntroOpen(true); }, [company.id, scenario.id]);

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

  /* ---- Express mode: apply what the recipient confirmed, one save at a time, through the normal lifecycle ---- */
  const applyExpress = async (plan: ExpressPlan, progress: (n: number) => void) => {
    let saved = 0; let failed = 0; let n = 0;
    const step = (ok: boolean) => { if (ok) saved += 1; else failed += 1; progress(++n); };
    // Requests save side by side; files for the same request save one after another.
    const jobs = new Map<string, (() => Promise<boolean>)[]>();
    const add = (id: string, job: () => Promise<boolean>) => jobs.set(id, [...(jobs.get(id) ?? []), job]);
    for (const { file, requestId } of plan.files) {
      const req = every.find((r) => r.id === requestId);
      add(requestId, async () => (req ? store.uploadFile(req, file, true) : false));
    }
    for (const { requestId, value } of plan.answers) {
      const req = every.find((r) => r.id === requestId);
      add(requestId, async () => (!req ? false : req.responseType === 'multiple_choice'
        ? store.saveSelection(requestId, { optionIds: [value] }, [], true)
        : store.saveAnswer(requestId, value, true)));
    }
    await Promise.all([...jobs.values()].map(async (chain) => { for (const job of chain) step(await job()); }));
    const kept = plan.unsorted.length ? await store.addUnsorted(plan.unsorted) : 0;
    setExpress({ open: false, files: [] });
    setCategory('all');
    const parts = [
      saved && `${saved} item${saved === 1 ? '' : 's'} saved`,
      kept && `${kept} file${kept === 1 ? '' : 's'} kept in Unsorted files`,
    ].filter(Boolean).join(' · ');
    if (parts) notify('positive', `Express mode: ${parts}.`);
    if (failed) notify('negative', `${failed} item${failed === 1 ? '' : 's'} could not be saved and ${failed === 1 ? 'stays' : 'stay'} Pending. Open ${failed === 1 ? 'it' : 'them'} to try again.`);
  };

  // A drop on a request card that takes files stays with that request (the card handles it first).
  const listDrop = {
    onDragOver: (e: DragEvent) => {
      if (!e.dataTransfer.types.includes('Files')) return;
      const overRow = (e.target as HTMLElement).closest('[data-file-drop], .scalar-dropzone');
      e.preventDefault();
      setDragging(!overRow);
    },
    onDragLeave: (e: DragEvent) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false); },
    onDrop: (e: DragEvent) => {
      setDragging(false);
      if (e.defaultPrevented || !e.dataTransfer.files.length) return;
      e.preventDefault();
      setExpress({ open: true, files: [...e.dataTransfer.files] });
    },
  };

  const clearFilters = () => { setCategory('all'); setStatusFilter('all'); };
  const statusText = STATUS_OPTIONS.find((o) => o.value === statusFilter)!.label;

  const expressButton = (
    <Button size="s" style={AI_BUTTON_STYLE} leadingIcon={<Icon size="s" tone="inherit"><glyphs.AiMark /></Icon>} onClick={() => setExpress({ open: true, files: [] })}>
      Express mode
    </Button>
  );

  const engagement = (
    <Text as="span" step="s" weight="semiBold" style={{ whiteSpace: 'nowrap', paddingInline: mobile ? undefined : space.s }}>
      {scenario.engagement} | Report Date {REQUEST_META.reportDate}
    </Text>
  );

  // The sender sets the date (an action, so a Button); the responder sees how long is left, in words.
  const due = dueWords(daysUntil(store.dueDate));
  const deadline = isSender ? (
    <Button size="s" variant="tertiary" leadingIcon={<Icon size="s" tone="inherit"><icons.EditCalendar /></Icon>} onClick={() => setDialog('due-date')}
      aria-label={`Due ${fmt(store.dueDate)}. Change due date`}>
      Due {fmt(store.dueDate)}
    </Button>
  ) : (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: space.xs, flex: 'none' }}>
      <Icon size="s" tone={due.tone === 'secondary' ? 'secondary' : due.tone}><icons.Schedule /></Icon>
      <Text as="span" step="s" weight={due.tone === 'secondary' ? 'regular' : 'semiBold'} tone={due.tone} style={{ whiteSpace: 'nowrap' }}>{due.text}</Text>
    </span>
  );

  /* ---- chrome ---- */
  const logo = scenario.brand === 'scalar'
    ? <img src="./assets/scalar-wordmark-white.png" alt="Scalar" style={{ display: 'block', height: size.icon.l, width: 'auto' }} />
    : <img className="scalar-primary-menu__logo" src="./assets/firm-logo.jpg" alt={scenario.senderName} />;

  // Fund admin: one company at a time. The menu shows each company's progress from its own stored list.
  const companyStats = scenario.companies.map((c, i) => {
    const list = c.id === company.id ? every : peekRequests(storeKey(state, scenario.id, c.id), () => seedFor(state, i, requestSet));
    const parents = list.filter((r) => !r.parentId);
    const resolved = parents.filter((r) => isResolved(r, list)).length;
    return { company: c, resolved, total: parents.length, complete: parents.length > 0 && resolved === parents.length };
  });
  const companiesComplete = companyStats.filter((x) => x.complete).length;
  const companySwitcher = multiCompany && (
    <span style={{ position: 'relative', display: 'inline-flex' }}>
      <CompanyDropdown expanded={companyMenu} onClick={() => setCompanyMenu((o) => !o)}>{company.name}</CompanyDropdown>
      {companyMenu && (
        <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: zIndex.overlay, marginTop: space.xs, background: color.bg.surface, borderRadius: radius.s, boxShadow: elevation.overlay, minWidth: 'max-content' }}>
          <Text as="p" step="s" tone="secondary" style={{ margin: 0, padding: `${space.s} ${space.m} 0` }}>
            {companiesComplete} of {scenario.companies.length} companies complete
          </Text>
          <CompanyDropdownPanel
            label="Companies in this request"
            currentId={company.id}
            initialFocus
            onClose={() => setCompanyMenu(false)}
            onSelect={(id) => { setCompanyId(id); setCompanyMenu(false); }}
            companies={companyStats.map((x) => ({
              id: x.company.id,
              name: (
                <span style={{ display: 'flex', justifyContent: 'space-between', gap: space.l, width: '100%' }}>
                  <span>{x.company.name}</span>
                  <Text as="span" step="s" tone={x.complete ? 'positive' : 'secondary'}>{x.complete ? 'Complete' : `${x.resolved}/${x.total}`}</Text>
                </span>
              ),
            }))}
          />
        </div>
      )}
    </span>
  );

  const navigation = (
    <PrimaryMenu
      navLabel="Portal"
      logo={logo}
      end={isSender ? (
        // Signed in to the platform: the same end-of-bar controls as the product (AppFrame), not Login.
        <>
          <Notification unread onClick={() => notify('info', 'Notifications are not part of this prototype.')} />
          {scenario.brand === 'scalar' && <ToolSwitch value={tool} onChange={setTool} />}
          <button type="button" aria-label={`${scenario.senderUser.name} — user menu`} title={scenario.senderUser.name}
            onClick={() => notify('info', `Signed in as ${scenario.senderUser.name} (${scenario.senderRole}).`)}
            style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer' }}>
            <Avatar size="s" className="scalar-avatar--ringed" initials={scenario.senderUser.initials} alt={scenario.senderUser.name} />
          </button>
          <button type="button" className="scalar-primary-menu__more" aria-label="More actions"
            onClick={() => notify('info', 'The actions menu is not part of this prototype.')}>
            <Icon size="l" tone="inherit"><icons.MoreVert /></Icon>
          </button>
        </>
      ) : loggedIn ? (
        <MainMenuItem icon={<Icon size="s" tone="onBrand"><icons.Logout /></Icon>} onClick={() => { setLoggedIn(null); notify('info', 'Logged out.'); }}>
          Log out
        </MainMenuItem>
      ) : (
        <MainMenuItem icon={<Icon size="s" tone="onBrand"><icons.Login /></Icon>} onClick={() => setDialog('login')}>
          Login
        </MainMenuItem>
      )}
    >
      {companySwitcher}
    </PrimaryMenu>
  );

  // A thin determinate bar (AI-GUIDE §5: progress with a known total) fits the 32px tier; the ring did not.
  const pct = total > 0 ? Math.round((resolvedCount / total) * 100) : 0;
  const progress = (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: space.s, flex: 'none' }}>
      <Text as="span" step="s" weight="semiBold" style={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
        {resolvedCount}/{total}
      </Text>
      <ProgressBar
        value={pct}
        label={`${resolvedCount} of ${total} information requests resolved`}
        style={{ width: mobile ? size.control.l : `calc(${size.control.l} * 3)` }}
      />
      {!mobile && total > 0 && (
        <Text as="span" step="s" tone="secondary" style={{ fontVariantNumeric: 'tabular-nums' }}>{pct}%</Text>
      )}
      {/* The header's label/value pair (CompanyInfo stories). Brand while work is left; positive only when done. */}
      <InformationLabel
        aria-live="polite"
        label={mobile ? 'Left' : 'Remaining'}
        value={total === 0 ? 'No requests' : remaining === 0 ? 'All resolved' : mobile ? String(remaining) : `${remaining} request${remaining === 1 ? '' : 's'}`}
        tone={total > 0 && remaining === 0 ? 'positive' : 'brand'}
      />
    </span>
  );

  const companyInfo = (
    <CompanyInfo
      name={company.name}
      end={expired ? undefined : <>
        {!mobile && deadline}
        {progress}
      </>}
    >
      {/* "Information Request" is the selected item of this row; the company it is for is the title.
          A phone has no room for the row: the help links move into the body. */}
      {!mobile && (
        <SecondaryMenu label="Request">
          <SecondaryMenuItem current>Information Request</SecondaryMenuItem>
          <SecondaryMenuItem onClick={() => setDialog('contact')}>Contact Us</SecondaryMenuItem>
          <SecondaryMenuItem onClick={() => setDialog('privacy')}>Privacy Policy</SecondaryMenuItem>
          <SecondaryMenuItem onClick={() => setDialog('help')}>How do I use this?</SecondaryMenuItem>
        </SecondaryMenu>
      )}
    </CompanyInfo>
  );

  const subNavigation = (
    <TertiaryMenu
      label="Request tools"
      end={<>
        {/* A phone's toolbar is full: there Express mode sits above the list instead. */}
        {!isSender && !mobile && expressButton}
        <div style={{ position: 'relative' }}>
          {/* A phone has no room for the label beside Select All and Bulk actions: the icon carries it. */}
          <Button size="s" variant="tertiary" disabled={!visible.length} aria-haspopup="menu" aria-expanded={expandMenu}
            aria-label={mobile ? 'Expand or collapse requests' : undefined}
            leadingIcon={<Icon size="s" tone="inherit"><icons.UnfoldMore /></Icon>}
            trailingIcon={mobile ? undefined : <Icon size="s" tone="inherit"><icons.ArrowDropDown /></Icon>} onClick={() => setExpandMenu((o) => !o)}>
            {mobile ? null : 'Expand'}
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
          <Button size="s" variant="secondary" disabled={!selectedVisible.length} aria-haspopup="menu" aria-expanded={bulkMenu}
            trailingIcon={<Icon size="s" tone="inherit"><icons.ArrowDropDown /></Icon>} onClick={() => setBulkMenu((o) => !o)}>
            Bulk actions
          </Button>
          {bulkMenu && selectedVisible.length > 0 && (
            <div style={{ position: 'absolute', top: '100%', right: 0, zIndex: zIndex.overlay, marginTop: space.xs, boxShadow: elevation.overlay }}>
              {/* APG menu pattern: focus moves into the menu when it opens. */}
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
      </>}
    >
      {!mobile && engagement}
    </TertiaryMenu>
  );

  /* ---- body ---- */
  const categoryNav = (
    <nav aria-label="Categories" style={{ display: 'flex', flexDirection: 'column', gap: space['2xs'] }}>
      {intro.length > 0 && (
        <SubmenuItem onClick={showIntro}>Introduction</SubmenuItem>
      )}
      <SubmenuItem current={category === 'all'} onClick={() => setCategory('all')}>
        <span style={{ display: 'flex', justifyContent: 'space-between', gap: space.s, width: '100%' }}>
          <span>All requests</span><Text as="span" step="s" tone="secondary">{resolvedCount}/{total}</Text>
        </span>
      </SubmenuItem>
      {categoriesInUse.map((c) => {
        const items = all.filter((r) => r.categoryId === c.id);
        const doneCount = items.filter(done).length;
        return (
          <SubmenuItem key={c.id} current={category === c.id} onClick={() => setCategory(c.id)}>
            <span style={{ display: 'flex', justifyContent: 'space-between', gap: space.s, width: '100%' }}>
              <span style={{ whiteSpace: 'nowrap' }}>{c.order}. {c.name}</span>
              <Text as="span" step="s" tone={doneCount === items.length ? 'positive' : 'secondary'}>
                {doneCount}/{items.length}<span className="scalar-visually-hidden"> resolved</span>
              </Text>
            </span>
          </SubmenuItem>
        );
      })}
    </nav>
  );

  const resetAll = () => {
    store.reset(scenario.companies.map((c) => storeKey(state, scenario.id, c.id)));
    setSelected(new Set()); setExpanded(new Set());
    notify('info', 'Prototype data reset.');
  };
  const prototypeControls = config.controls && (
    <div style={{ display: 'flex', flexDirection: 'column', gap: space.m, padding: space.m, borderTop: `1px solid ${color.stroke.divider}` }}>
      <Overline as="h2">Prototype view</Overline>
      <RadioGroup label="Who sent the request" size="s" value={config.scenario} onValueChange={(v) => setConfig({ scenario: v as typeof config.scenario })}>
        {SCENARIO_IDS.map((id) => <Radio key={id} value={id}><Text as="span" step="s">{SCENARIOS[id].label}</Text></Radio>)}
      </RadioGroup>
      <SegmentedControl<Viewer>
        label="Viewing as"
        value={config.viewer}
        onChange={(v) => setConfig({ viewer: v })}
        options={[{ value: 'responder', label: 'Responder' }, { value: 'sender', label: scenario.senderRole }]}
      />
      <SegmentedControl<LinkState>
        label="Link"
        value={config.link}
        onChange={(v) => setConfig({ link: v })}
        options={[{ value: 'active', label: 'Active link' }, { value: 'expired', label: 'Expired link' }]}
      />
      <Text step="s" tone="secondary">Answers and files are kept in this browser only. Nothing is uploaded or encrypted.</Text>
      <Checkbox size="s" checked={store.simulateFailure} onChange={(e) => store.setSimulateFailure(e.currentTarget.checked)}>
        <Text as="span" step="s">Simulate save / upload failure</Text>
      </Checkbox>
      <div><Button size="s" variant="tertiary" onClick={resetAll}>Reset prototype data</Button></div>
    </div>
  );

  // For the recipient (not signed in): who can see this request, and that files are protected.
  const securityNote = !isSender && (
    <div style={{ display: 'flex', flexDirection: 'column', gap: space.s, padding: space.m, borderTop: `1px solid ${color.stroke.divider}` }}>
      <span style={{ display: 'flex', gap: space.s, alignItems: 'flex-start' }}>
        <Icon size="s" tone="secondary"><icons.Lock /></Icon>
        <Text as="span" step="s" tone="secondary">Files are encrypted.</Text>
      </span>
      <span style={{ display: 'flex', gap: space.s, alignItems: 'flex-start' }}>
        <Icon size="s" tone="secondary"><icons.VerifiedUser /></Icon>
        <Text as="span" step="s" tone="secondary">Only approved users can access this request. Use Delegate to forward requests to other coworkers.</Text>
      </span>
    </div>
  );

  const introduction = intro.length > 0 && introOpen && category === 'all' && (
    <div style={{ padding: space.m, borderBottom: `1px solid ${color.stroke.divider}` }}>
      <Alert tone="info" title={`Introduction from ${scenario.senderName}`} onDismiss={() => setIntroOpen(false)} dismissLabel="Dismiss introduction">
        <div style={{ display: 'flex', flexDirection: 'column', gap: space.s }}>
          {intro.map((p) => <Text as="p" key={p} step="m" style={{ margin: 0 }}>{p}</Text>)}
        </div>
      </Alert>
    </div>
  );

  // Files Express mode couldn't place, kept for the recipient (never sent to the analyst on their own).
  const assignable = all.filter((r) => r.status === 'pending' && (r.responseType === 'file' || r.responseType === 'template_file'));
  const unsortedTray = !isSender && store.unsorted.length > 0 && category === 'all' && (
    <div style={{ display: 'flex', flexDirection: 'column', gap: space.s, padding: space.m, borderBottom: `1px solid ${color.stroke.divider}` }}>
      <Overline as="h2">{`Unsorted files (${store.unsorted.length})`}</Overline>
      <Text step="s" tone="secondary">Express mode couldn’t match these. Assign each one to a request, or remove it.</Text>
      {store.unsorted.map((f) => (
        <div key={f.id} style={{ display: 'grid', gridTemplateColumns: mobile ? 'minmax(0, 1fr) auto' : 'minmax(0, 1fr) minmax(0, 1fr) auto', alignItems: 'center', gap: space.s }}>
          <div style={{ minWidth: 0, gridColumn: mobile ? '1 / -1' : undefined }}><FileRow name={f.name} meta={[{ label: formatBytes(f.sizeBytes) }]} /></div>
          <Select aria-label={`Assign ${f.name} to a request`} value=""
            onChange={async (e) => {
              const req = all.find((r) => r.id === e.currentTarget.value);
              if (!req) return;
              const ok = await store.assignUnsorted(f, req);
              notify(ok ? 'positive' : 'negative', ok ? `${f.name} saved to request ${requestNumber(req)}.` : `${f.name} was not saved to request ${requestNumber(req)}. Open it to see why.`);
            }}>
            <option value="" disabled>Assign to…</option>
            {assignable.map((r) => <option key={r.id} value={r.id}>{requestNumber(r)} {r.title}</option>)}
          </Select>
          <Button variant="tertiary" size="s" tone="negative" onClick={() => { store.removeUnsorted(f.id); notify('info', `${f.name} removed.`); }}>Remove</Button>
        </div>
      ))}
    </div>
  );

  const list = total === 0 ? (
    <EmptyState type="no-data" title="No requests yet" body={`${scenario.senderName} has not sent any requests for ${company.name} for this report date. You’ll get an email when they do.`} icon={<icons.Inbox />} />
  ) : visible.length === 0 ? (
    <EmptyState
      type="no-results"
      title={statusFilter === 'pending' && category === 'all' ? 'Nothing left to do' : 'No requests match these filters'}
      body={`Showing ${statusText.toLowerCase()} requests${category === 'all' ? '' : ` in ${CATEGORIES.find((c) => c.id === category)?.name}`}.`}
      icon={<icons.FilterAlt />}
      actions={<Button variant="secondary" size="s" onClick={clearFilters}>Clear filters</Button>}
    />
  ) : (
    <ul aria-label="Requests" style={{ margin: 0, padding: 0 }}>
      {visible.map((r, i) => {
        const showHeader = category === 'all' && (i === 0 || visible[i - 1]!.categoryId !== r.categoryId);
        const cat = CATEGORIES.find((c) => c.id === r.categoryId)!;
        return (
          <RequestRowWithHeader key={r.id} header={showHeader ? `${cat.order}. ${cat.name}` : undefined}>
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
              mobile={mobile}
            />
          </RequestRowWithHeader>
        );
      })}
    </ul>
  );

  return (
    <ScalarProvider mode="light" viewport="auto">
      <div style={{ height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: color.bg.page }}>
        {expired ? (
          <PageTemplate fullHeight={false} navigation={navigation} companyInfo={companyInfo}>
            <ExpiredLink
              email={scenario.recipient.email}
              sender={scenario.senderName}
              company={company.name}
              simulateFailure={store.simulateFailure}
              onLogin={() => setDialog('login')}
            />
            {prototypeControls && (
              <div style={{ alignSelf: 'center', width: '100%', maxWidth: '60ch', marginBottom: space.l, border: `1px solid ${color.stroke.default}`, borderRadius: radius.s, background: color.bg.surface }}>
                {prototypeControls}
              </div>
            )}
          </PageTemplate>
        ) : (
        <PageTemplate fullHeight={false} navigation={navigation} companyInfo={companyInfo} subNavigation={subNavigation}>
          <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: mobile ? 'minmax(0, 1fr)' : 'minmax(min-content, 1fr) minmax(0, 4fr)', gap: space.l, paddingBlock: space.m }}>
            {!mobile && (
              <aside style={{ minHeight: 0, overflow: 'auto', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: `1px solid ${color.stroke.default}`, borderRadius: radius.s, background: color.bg.surface }}>
                <div style={{ padding: space.s }}>
                  <Overline as="h2" style={{ padding: `${space.xs} ${space.s}` }}>Categories</Overline>
                  {categoryNav}
                </div>
                <div>
                  {securityNote}
                  {prototypeControls}
                </div>
              </aside>
            )}
            <section aria-label="Requests" {...(isSender ? {} : listDrop)}
              style={{ minHeight: 0, overflow: 'auto', border: `1px solid ${dragging ? color.stroke.brand : color.stroke.default}`, borderRadius: radius.s, background: color.bg.surface }}>
              {mobile && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: space.s, padding: space.m, borderBottom: `1px solid ${color.stroke.divider}` }}>
                  {engagement}
                  {!isSender && <div>{expressButton}</div>}
                  <FormField label="Category">
                    <Select value={category} onChange={(e) => (e.currentTarget.value === 'intro' ? showIntro() : setCategory(e.currentTarget.value))}>
                      {intro.length > 0 && <option value="intro">Introduction</option>}
                      <option value="all">All requests ({resolvedCount}/{total})</option>
                      {categoriesInUse.map((c) => {
                        const items = all.filter((r) => r.categoryId === c.id);
                        return <option key={c.id} value={c.id}>{c.order}. {c.name} ({items.filter(done).length}/{items.length})</option>;
                      })}
                    </Select>
                  </FormField>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: space.s }}>
                    {deadline}
                    <Button size="s" variant="tertiary" onClick={() => setDialog('help')}>How do I use this?</Button>
                    <Button size="s" variant="tertiary" onClick={() => setDialog('contact')}>Contact Us</Button>
                    <Button size="s" variant="tertiary" onClick={() => setDialog('privacy')}>Privacy Policy</Button>
                  </div>
                </div>
              )}
              {total > 0 && remaining === 0 && (
                <div style={{ padding: space.m }}>
                  <Banner tone="positive" title="Every request is resolved">
                    {`Thank you. ${scenario.senderName} can see your responses for ${company.name}. You can still open a request to change it.`}
                  </Banner>
                </div>
              )}
              {dragging && (
                <div style={{ position: 'sticky', top: 0, zIndex: zIndex.sticky, padding: space.m, background: color.bg.surface }}>
                  <Alert tone="info" title="Drop to sort with Express mode" icon={<Icon size="m" tone="inherit"><glyphs.AiMark /></Icon>}>
                    We’ll suggest which request each file answers. You review them before anything is saved.
                  </Alert>
                </div>
              )}
              {unsortedTray}
              {introduction}
              {list}
              {mobile && securityNote}
              {mobile && prototypeControls}
            </section>
          </div>
        </PageTemplate>
        )}

        <ToastViewport aria-label="Notifications">
          {toasts.map((t) => (
            <Toast key={t.id} tone={t.tone} onDismiss={() => dropToast(t.id)}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: space.s, flexWrap: 'wrap' }}>
                {t.text}
                {t.action && (
                  <Button variant="tertiary" size="xs" onClick={() => { t.action!.onClick(); dropToast(t.id); }}>{t.action.label}</Button>
                )}
              </span>
            </Toast>
          ))}
        </ToastViewport>

        <LoginDialog
          open={dialog === 'login'}
          onClose={() => setDialog(null)}
          email={scenario.recipient.email}
          onLogin={(email) => { setLoggedIn(email); setDialog(null); notify('positive', `Logged in as ${email}.`); }}
        />
        <ContactDialog open={dialog === 'contact'} onClose={() => setDialog(null)} notify={notify} />
        <PrivacyDialog open={dialog === 'privacy'} onClose={() => setDialog(null)} sender={scenario.senderName} poweredBy={scenario.poweredBy} />
        <HelpDialog open={dialog === 'help'} onClose={() => setDialog(null)} poweredBy={scenario.poweredBy} multiCompany={multiCompany} />
        <DueDateDialog
          open={dialog === 'due-date'}
          onClose={() => setDialog(null)}
          dueDate={store.dueDate}
          onSave={(iso) => { store.setDueDate(iso); notify('positive', `Due date changed to ${fmt(iso)}.`); }}
        />
        <ExpressModeDialog
          open={express.open}
          onClose={() => setExpress({ open: false, files: [] })}
          requests={every}
          requestSet={requestSet}
          initialFiles={express.files}
          onApply={applyExpress}
        />
        <DelegateDialog
          open={dialog === 'delegate'}
          onClose={() => setDialog(null)}
          count={delegateIds.length}
          onSubmit={async (email) => { await store.delegate(delegateIds, email); notify('positive', `Delegated to ${email}.`); setSelected(new Set()); }}
        />
      </div>
    </ScalarProvider>
  );
}

function RequestRowWithHeader({ header, children }: { header?: string; children: ReactNode }) {
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
