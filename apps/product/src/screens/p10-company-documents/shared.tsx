/**
 * Chrome shared by Company · Documents, Questions and Requests: the sub-nav
 * (Documents / Questions / Requests) and the request heading (title, progress
 * bar, request counts, page actions, "New Info Request" and the page ⋮ menu).
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Button, ButtonIcon, ContextMenu, Heading, Icon, Input, MenuItem, ProgressBar, TertiaryMenuItem, Text,
  icons, space, zIndex,
} from '@scalar/design-system';
import { href, navigate } from '../../router.js';
import { routes } from '../../routes.js';
import { useDismiss } from '../p04-waterfalls/useDismiss.js';

export type DocumentsTab = 'documents' | 'questions' | 'requests';

export function DocumentsSubNav({ companyId, current }: { companyId: string; current: DocumentsTab }) {
  return (
    <>
      <TertiaryMenuItem current={current === 'documents'} href={href(routes.company.documents(companyId))}>Documents</TertiaryMenuItem>
      <TertiaryMenuItem current={current === 'questions'} href={href(routes.company.questions(companyId))}>Questions</TertiaryMenuItem>
      <TertiaryMenuItem current={current === 'requests'} href={href(routes.company.requests(companyId))}>Requests</TertiaryMenuItem>
    </>
  );
}

/**
 * Opens the request builder. The last item of Tier 3 on Documents, Questions
 * and Requests. It starts a task, so it is an action, not a link.
 */
export function InfoRequestButton({ companyId }: { companyId: string }) {
  return (
    <Button
      variant="primary"
      size="xs"
      leadingIcon={<Icon size="s" tone="inherit"><icons.Mail /></Icon>}
      onClick={() => navigate(routes.company.informationRequest(companyId))}
    >
      Info Request
    </Button>
  );
}

export function CompanyActionsButton() {
  return <ButtonIcon variant="tertiary" size="xs" label="Company actions" icon={<Icon size="l" tone="primary"><icons.MoreVert /></Icon>} />;
}

export interface ProgressCounts {
  done: number;
  total: number;
  /** e.g. "Requests: 27 sent, 5 resolved, 22 pending". */
  text: string;
  /** Accessible name of the bar. */
  label: string;
}

/** A slim determinate bar (Feedback › ProgressBar) with its done/total fraction and the counts in words. */
export function RequestsProgress({ counts, step = 'm' }: { counts: ProgressCounts; step?: 's' | 'm' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: space.s, minWidth: 0 }}>
      <div style={{ flex: '0 0 auto', width: '8vw', display: 'flex' }}>
        <ProgressBar value={counts.total ? (counts.done / counts.total) * 100 : 0} label={counts.label} />
      </div>
      <Text as="span" step="s" tone="secondary" style={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
        {counts.done}/{counts.total}
      </Text>
      <Text as="span" step={step} tone="secondary" truncate>{counts.text}</Text>
    </div>
  );
}

/**
 * Search that lives in Tier 3: a search icon that opens a small field in the
 * same row. Escape clears and closes it; it also closes when left empty.
 */
export function TierSearch({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const [open, setOpen] = useState(!!value);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { if (open) input.current?.focus(); }, [open]);
  if (!open) {
    return (
      <ButtonIcon
        variant="tertiary" size="xs" label={label} onClick={() => setOpen(true)}
        icon={<Icon size="s" tone="secondary"><icons.Search /></Icon>}
      />
    );
  }
  return (
    <div style={{ width: '18vw' }}>
      <Input
        ref={input}
        aria-label={label}
        placeholder={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Escape') { onChange(''); setOpen(false); } }}
        onBlur={() => { if (!value) setOpen(false); }}
        leadingIcon={<Icon size="s" tone="secondary"><icons.Search /></Icon>}
      />
    </div>
  );
}

/** The ⋮ page menu: edit the company's questions and documents, or track pending responses. */
export function PageActionsMenu({ companyId, label, menuOpen: initialMenu = false, trigger = 'page' }: {
  companyId: string;
  label: string;
  menuOpen?: boolean;
  /** `company`: drawn like the company row's ⋮ (Company actions). `page`: the in-page ⋮. */
  trigger?: 'company' | 'page';
}) {
  const [menuOpen, setMenuOpen] = useState(initialMenu);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setMenuOpen(false), []);
  useDismiss(ref, menuOpen, close);
  return (
    <div style={{ position: 'relative', display: 'flex' }}>
      <span data-popover-trigger="">
        <ButtonIcon
          variant="tertiary"
          size={trigger === 'company' ? 'xs' : undefined}
          label={label}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
          icon={trigger === 'company'
            ? <Icon size="l" tone="primary"><icons.MoreVert /></Icon>
            : <Icon size="s" tone="inherit"><icons.MoreVert /></Icon>}
        />
      </span>
      {menuOpen && (
        <div ref={ref} style={{ position: 'absolute', top: '100%', right: 0, zIndex: zIndex.overlay }}>
          <ContextMenu label={label}>
            <MenuItem icon={<Icon size="s" tone="inherit"><icons.EditNote /></Icon>} href={href(routes.company.informationRequest(companyId))}>
              Edit Company Questions and Documents
            </MenuItem>
            <MenuItem icon={<Icon size="s" tone="inherit"><icons.Inbox /></Icon>} href={href(routes.company.requests(companyId))}>
              Track pending responses
            </MenuItem>
          </ContextMenu>
        </div>
      )}
    </div>
  );
}

/**
 * The company row's right end on Documents, Questions and Requests: the page's
 * progress, then the ⋮ menu. The tabs already say which page this is, so the
 * page has no title of its own.
 */
export function CompanyDocsHeaderEnd({ companyId, counts, menuOpen }: { companyId: string; counts: ProgressCounts; menuOpen?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: space.m, minWidth: 0 }}>
      <RequestsProgress counts={counts} step="s" />
      <PageActionsMenu companyId={companyId} label="Company actions" trigger="company" menuOpen={menuOpen} />
    </div>
  );
}

/** Title, progress and ⋮ menu — the firm Requests / Questions tabs, where the page names the picked company. */
export function RequestsHeading({ companyId, title, counts, actions, menuOpen }: {
  companyId: string;
  title: string;
  counts: ProgressCounts;
  /** Page actions before the ⋮ menu. */
  actions?: ReactNode;
  menuOpen?: boolean;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: space.m }}>
      <Heading level={2} step="2xl">{title}</Heading>
      <RequestsProgress counts={counts} />
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: space.s }}>
        {actions}
        <PageActionsMenu companyId={companyId} label={`${title} page actions`} menuOpen={menuOpen} />
      </div>
    </div>
  );
}

/** "Requests: 27 sent, 5 resolved, 22 pending" — every count from the same list. */
export const requestsText = (c: { total: number; resolved: number; pending: number }) =>
  `Requests: ${c.total} sent, ${c.resolved} resolved, ${c.pending} pending`;
