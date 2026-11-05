/**
 * Chrome shared by Company · Documents, Requests, Exports and Final Report:
 * the Tier 3 tabs, Info Request, the request meter and the company row's ⋮ menu.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Button, ButtonIcon, ContextMenu, Icon, Input, MenuItem, ProgressBar, TertiaryMenuItem, Text, Tooltip,
  icons, size, space, zIndex,
} from '@scalar/design-system';
import { href, navigate } from '../../router.js';
import { routes } from '../../routes.js';
import { companyById } from '../../data/fixtures.js';
import { useDismiss } from '../p04-waterfalls/useDismiss.js';
import { formatDay } from '../prototypes/request-portal/model.js';
import { useViewAs } from '../../shell/viewAs.js';
import { useFinalReport } from './finalReportData.js';

export type DocumentsTab = 'documents' | 'requests' | 'exports' | 'final-report';

/**
 * Tier 3 inside a company: Documents · Requests · Exports · Final Report.
 * Questions folded into Requests. Final Report carries a warning mark, for
 * analysts, while its final version is out of date — a status with a name,
 * never colour alone.
 */
export function DocumentsSubNav({ companyId, current }: { companyId: string; current: DocumentsTab }) {
  const report = useFinalReport(companyId, companyById(companyId).asOf);
  const [viewer] = useViewAs();
  // Clients never see report statuses, so no warning mark for them.
  const stale = report.status === 'out-of-date' && viewer === 'analyst';
  return (
    <>
      <TertiaryMenuItem current={current === 'documents'} href={href(routes.company.documents(companyId))}>Documents</TertiaryMenuItem>
      <TertiaryMenuItem current={current === 'requests'} href={href(routes.company.requests(companyId))}>Requests</TertiaryMenuItem>
      <TertiaryMenuItem current={current === 'exports'} href={href(routes.company.exports(companyId))}>Exports</TertiaryMenuItem>
      <TertiaryMenuItem
        current={current === 'final-report'}
        href={href(routes.company.finalReport(companyId))}
        tags={stale ? <Icon size="xs" tone="warning" label="Final report out of date"><icons.Error /></Icon> : undefined}
      >
        Final Report
      </TertiaryMenuItem>
    </>
  );
}

/**
 * Opens the request builder. The last item of Tier 3 on Requests (Documents
 * reaches the builder from the ⋮ menu). It starts a task, so it is an action, not a link.
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

/** True below `px` wide — the meter drops to "27/29" on narrow screens. */
export function useNarrow(px: number) {
  const q = `(max-width: ${px - 1}px)`;
  const [narrow, setNarrow] = useState(() => window.matchMedia(q).matches);
  useEffect(() => {
    const m = window.matchMedia(q);
    const on = () => setNarrow(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, [q]);
  return narrow;
}

export interface MeterCounts { total: number; resolved: number; pending: number; dueDate?: string }

/**
 * The compact request meter at the left of the Requests toolbar: a short bar
 * and "27 of 29 resolved". The breakdown is in its tooltip; pressing it shows
 * only what is pending. Complete: Positive bar, check and "All 29 resolved".
 */
export function RequestsMeter({ counts, onShowPending }: { counts: MeterCounts; onShowPending: () => void }) {
  const narrow = useNarrow(1280);
  const { total, resolved, pending, dueDate } = counts;
  if (!total) return null;
  const complete = pending === 0;
  const words = complete ? `All ${total} resolved` : narrow ? `${resolved}/${total}` : `${resolved} of ${total} resolved`;
  const breakdown = `${total} sent · ${resolved} resolved · ${pending} pending${dueDate ? ` · due ${formatDay(dueDate)}` : ''}`;
  return (
    <Tooltip content={complete ? breakdown : `${breakdown}. Press to show only what is pending.`}>
      <button
        type="button"
        className="scalar-focusable"
        aria-label={`${resolved} of ${total} requests resolved, ${pending} pending.${complete ? '' : ' Show pending requests.'}`}
        onClick={complete ? undefined : onShowPending}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: space.s, padding: `0 ${space.xs}`, minHeight: size.target.dense,
          background: 'none', border: 0, cursor: complete ? 'default' : 'pointer', font: 'inherit', color: 'inherit',
        }}
      >
        <span style={{ width: `calc(${size.control.l} * 2)`, display: 'flex' }} aria-hidden>
          <ProgressBar value={(resolved / total) * 100} label="Requests resolved" />
        </span>
        {complete && <Icon size="s" tone="positive"><icons.CheckCircle /></Icon>}
        <Text as="span" step="s" tone={complete ? 'positive' : 'secondary'} style={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{words}</Text>
      </button>
    </Tooltip>
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

/** The company row's right end on every Documents tab: the ⋮ menu. The tabs name the page; request progress lives on Requests. */
export function CompanyDocsHeaderEnd({ companyId, menuOpen }: { companyId: string; menuOpen?: boolean }) {
  return <PageActionsMenu companyId={companyId} label="Company actions" trigger="company" menuOpen={menuOpen} />;
}

/** "Requests: 27 sent, 5 resolved, 22 pending" — every count from the same list. */
export const requestsText = (c: { total: number; resolved: number; pending: number }) =>
  `Requests: ${c.total} sent, ${c.resolved} resolved, ${c.pending} pending`;
