/**
 * Chrome shared by Company · Documents, Questions and Requests: the sub-nav
 * (Documents / Questions / Requests) and the request heading (title, progress
 * bar, request counts, page actions, "New Info Request" and the page ⋮ menu).
 */
import { useCallback, useRef, useState, type ReactNode } from 'react';
import {
  Button, ButtonIcon, ContextMenu, Heading, Icon, MenuItem, ProgressBar, TertiaryMenuItem, Text,
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

export function RequestsHeading({ companyId, title, counts, actions, menuOpen: initialMenu = false }: {
  companyId: string;
  title: string;
  /** e.g. "Requests: 27 sent, 5 resolved, 22 pending". */
  counts: { done: number; total: number; text: string; label: string };
  /** Page actions before the ⋮ menu. */
  actions?: ReactNode;
  menuOpen?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(initialMenu);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setMenuOpen(false), []);
  useDismiss(ref, menuOpen, close);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: space.m }}>
      <Heading level={2} step="2xl">{title}</Heading>
      {/* A slim determinate bar (Feedback › ProgressBar) with its fraction, so the count stays readable. */}
      <div style={{ flex: '0 0 15%', display: 'flex', alignItems: 'center', gap: space.s }}>
        <ProgressBar value={counts.total ? (counts.done / counts.total) * 100 : 0} label={counts.label} />
        <Text as="span" step="s" tone="secondary" style={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
          {counts.done}/{counts.total}
        </Text>
      </div>
      <Text step="m" tone="secondary">{counts.text}</Text>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: space.s, position: 'relative' }}>
        {actions}
        <span data-popover-trigger="">
          <ButtonIcon
            variant="tertiary"
            label={`${title} page actions`}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
            icon={<Icon size="s" tone="inherit"><icons.MoreVert /></Icon>}
          />
        </span>
        {menuOpen && (
          <div ref={ref} style={{ position: 'absolute', top: '100%', right: 0, zIndex: zIndex.overlay }}>
            <ContextMenu label={`${title} page actions`}>
              <MenuItem
                icon={<Icon size="s" tone="inherit"><icons.EditNote /></Icon>}
                href={href(routes.company.informationRequest(companyId))}
              >
                Edit Company Questions and Documents
              </MenuItem>
              <MenuItem
                icon={<Icon size="s" tone="inherit"><icons.Inbox /></Icon>}
                href={href(routes.company.requests(companyId))}
              >
                Track pending responses
              </MenuItem>
            </ContextMenu>
          </div>
        )}
      </div>
    </div>
  );
}

/** "Requests: 27 sent, 5 resolved, 22 pending" — every count from the same list. */
export const requestsText = (c: { total: number; resolved: number; pending: number }) =>
  `Requests: ${c.total} sent, ${c.resolved} resolved, ${c.pending} pending`;
