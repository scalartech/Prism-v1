/**
 * The platform chrome every screen sits in: the navy Primary Menu (product
 * areas, company picker, portfolio date, search, notifications, user) and the
 * page body under it.
 *
 * The frame is exactly one viewport tall and never scrolls as a document: the
 * navigation tiers (Primary Menu, company header + Secondary Menu, Tertiary
 * Menu) stay pinned at the top and only the page body scrolls under them. Every
 * screen's body is a `<main style={scrollBody}>` (or `PageBody`, which is one);
 * the dock below it stays docked at the foot. When the body holds exactly one
 * table, its column header stays pinned too (`usePinnedTableHead`).
 *
 * The global menus are real and clickable on every screen — a Figma frame that
 * shows one open (e.g. "Home — Global Search open") just passes `openMenu`.
 */
import { createContext, useContext, useEffect, useRef, useState, type ComponentType, type CSSProperties, type ReactNode } from 'react';
import {
  Avatar, Chip, CompanyDropdown, Icon, MainMenuItem,
  Notification, PrimaryMenu, ScalarProvider, SearchBar, Selector, icons,
  ToolSwitch, color, space, type ToolSwitchValue,
} from '@scalar/design-system';
import { href } from '../router.js';
import { routes } from '../routes.js';
import { portfolioDate, user, type Company } from '../data/fixtures.js';
import { overlays, type GlobalMenu, type OverlayProps } from './overlays/index.js';
import { useValuationContext } from '../domain/context.js';
import { usFromIso } from '../domain/model.js';
import { usePinnedTableHead } from './usePinnedTableHead.js';
import { useViewAs } from './viewAs.js';

/**
 * Prototype hook: lets a prototype swap a global menu's surface, drive the
 * bell's unread dot and AI-working outline, and know which menu is open, while composing a real screen
 * unchanged. Product screens never provide it, so the defaults apply.
 */
export interface GlobalMenuOverrides {
  menus?: Partial<Record<GlobalMenu, ComponentType<OverlayProps>>>;
  /** The bell's unread dot. Default on. */
  unread?: boolean;
  /** AI is working on a job the user will be notified about: the bell's outline orbits. Default off. */
  aiWorking?: boolean;
  /** Menu open on first render, when the screen passes none. */
  openMenu?: GlobalMenu;
  onMenuChange?: (menu: GlobalMenu | undefined) => void;
}

export const GlobalMenuOverridesContext = createContext<GlobalMenuOverrides>({});

export type Area = 'home' | 'intelligence' | 'valuations' | 'waterfalls' | 'documents' | 'reports' | 'company' | 'settings';

export interface AppFrameProps {
  /** Which Primary Menu item is current. `company` and `settings` light none. */
  area: Area;
  /** Set on company pages: the picker shows the company instead of "Companies". */
  company?: Company;
  /** The Date selector value on firm pages. Company pages ignore it: they show the measurement in the company's valuation context. */
  date?: string;
  /** Open a global menu on first render — used by the Figma states that show one. */
  openMenu?: GlobalMenu;
  /** Screen-level overlay (modal, drawer, popover) drawn above the body. */
  overlay?: ReactNode;
  children?: ReactNode;
}

export function AppFrame({ area, company, date, openMenu, overlay, children }: AppFrameProps) {
  const overrides = useContext(GlobalMenuOverridesContext);
  const [viewer] = useViewAs();
  const initialMenu = openMenu ?? overrides.openMenu;
  const [open, setOpen] = useState<GlobalMenu | undefined>(initialMenu);
  const [tool, setTool] = useState<ToolSwitchValue>('valuations');
  useEffect(() => setOpen(initialMenu), [initialMenu]);
  const { onMenuChange } = overrides;
  useEffect(() => onMenuChange?.(open), [open, onMenuChange]);
  // Closing Global Search hands focus back to the search bar, whose onFocus would reopen it.
  const closedAt = useRef(0);
  const body = useRef<HTMLDivElement>(null);
  usePinnedTableHead(body);

  const toggle = (m: GlobalMenu) => () => setOpen((cur) => (cur === m ? undefined : m));
  const Overlay = open ? (overrides.menus?.[open] ?? overlays[open]) : undefined;

  return (
    <ScalarProvider mode="light" viewport="auto">
      <div style={{ height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: color.bg.page }}>
        <PrimaryMenu
          logo={
            <a href={href(routes.home)} aria-label="Scalar home" style={{ display: 'inline-flex' }}>
              <img className="scalar-primary-menu__logo" src="./assets/firm-logo.jpg" alt="" />
            </a>
          }
          end={
            <>
              {/* Prototype View as: screenshots taken as a client must not pass for the analyst view. */}
              {viewer === 'client' && <Chip size="s" styleVariant="warning" leadingIcon={<Icon size="xs" tone="inherit"><icons.Visibility /></Icon>}>Viewing as client</Chip>}
              <SearchBar
                readOnly
                onFocus={() => { if (Date.now() - closedAt.current > 300) setOpen('search'); }}
              />
              <Notification unread={overrides.unread ?? true} working={overrides.aiWorking} onClick={toggle('notifications')} />
              <ToolSwitch value={tool} onChange={setTool} />
              <button
                type="button"
                onClick={toggle('user')}
                aria-label="User menu"
                aria-expanded={open === 'user' || open === 'user-firm-settings'}
                style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer' }}
              >
                <Avatar size="s" className="scalar-avatar--ringed" initials={user.initials} alt={user.name} />
              </button>
              <button type="button" className="scalar-primary-menu__more" aria-label="More">
                <Icon size="l" tone="inherit"><icons.MoreVert /></Icon>
              </button>
            </>
          }
        >
          <MainMenuItem current={area === 'intelligence'} href={href(routes.intelligence.summaries)}>Intelligence</MainMenuItem>
          <MainMenuItem current={area === 'valuations'} href={href(routes.valuations)}>Valuations</MainMenuItem>
          <MainMenuItem current={area === 'waterfalls'} href={href(routes.waterfalls)}>Waterfalls</MainMenuItem>
          <MainMenuItem current={area === 'documents'} href={href(routes.documents)}>Documents</MainMenuItem>
          <MainMenuItem current={area === 'reports'} href={href(routes.reports)}>Reports</MainMenuItem>
          <CompanyDropdown expanded={open === 'companies'} onClick={toggle('companies')}>
            {company ? company.name : 'Companies'}
          </CompanyDropdown>
          {company
            ? <CompanyMeasurement company={company} expanded={open === 'date'} onClick={toggle('date')} />
            : <Selector label="Measurement Date" value={date ?? portfolioDate} expanded={open === 'date'} onClick={toggle('date')} />}
        </PrimaryMenu>

        <div ref={body} style={{ position: 'relative', flex: 1, minHeight: 0, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
          {children}
          {Overlay && <Overlay menu={open!} company={company} onClose={() => { closedAt.current = Date.now(); setOpen(undefined); }} />}
          {overlay}
        </div>
      </div>
    </ScalarProvider>
  );
}

/**
 * On company pages the Date selector shows the measurement in the company's
 * valuation context (P1), so every company page agrees on it.
 */
function CompanyMeasurement({ company, expanded, onClick }: { company: Company; expanded: boolean; onClick: () => void }) {
  const { measurement, model } = useValuationContext(company);
  const latest = measurement.date === model.measurements[0]!.date;
  const shown = usFromIso(measurement.date);
  return <Selector label="Measurement Date" value={latest ? `Most Recent ${shown}` : shown} expanded={expanded} onClick={onClick} />;
}

/**
 * The page body's scroll region: it takes the height the navigation tiers and
 * the dock leave over and scrolls on its own, so they stay put (sticky chrome).
 */
export const scrollBody: CSSProperties = { flex: 1, minHeight: 0, overflow: 'auto' };

/** Standard padded page body for firm-level screens. */
export function PageBody({ children, gap = space.l }: { children?: ReactNode; gap?: string }) {
  return (
    <main style={{ ...scrollBody, padding: space.l, display: 'flex', flexDirection: 'column', gap }}>
      {children}
    </main>
  );
}
