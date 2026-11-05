import {
  forwardRef, useCallback, useEffect, useId, useRef, useState,
  type ButtonHTMLAttributes, type HTMLAttributes, type KeyboardEvent, type MouseEvent, type ReactNode,
} from 'react';
import { cx } from '../../utils/cx.js';
import { useControllableState } from '../../utils/useControllableState.js';
import { useIsomorphicLayoutEffect } from '../../utils/useIsomorphicLayoutEffect.js';
import { VisuallyHidden } from '../../utils/VisuallyHidden.js';
import { Icon } from '../icon/Icon.js';
import {
  ArrowDown, ArrowUp, ChevronDown, ChevronLeft, ChevronRight, Close, Copy, Download, DragHandle, Edit, Expand, Folder,
  MoreVertical, Trash, ZoomOut,
} from '../icon/glyphs.js';
import * as m from '../icon/material.js';
import { ButtonIcon } from '../button/ButtonIcon.js';
import { Button } from '../button/Button.js';
import { CheckboxItem } from '../checkbox/CheckboxItem.js';
import type { FileKind } from '../../tokens/index.js';

/* ---------------------------------------------------------------------------
 * File Type Badge
 * ------------------------------------------------------------------------ */


const EXT_KIND: Record<string, FileKind> = {
  pdf: 'pdf', doc: 'word', docx: 'word', xls: 'sheet', xlsx: 'sheet', csv: 'sheet',
  png: 'image', jpg: 'image', jpeg: 'image', gif: 'image', svg: 'image', txt: 'text', md: 'text',
};

/** Maps a file name or extension to its File/* token family. */
export const fileKindOf = (nameOrExt: string): FileKind =>
  EXT_KIND[nameOrExt.split('.').pop()?.toLowerCase() ?? ''] ?? 'generic';

export interface FileTypeBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /** File name or extension ("report.pdf", "xlsx"). */
  file: string;
}

/**
 * File Type Badge — colour-coded extension. Bound to the File/* family:
 * colour identifies a format, never a status. The extension text is always
 * shown — colour alone is not enough (R8).
 */
export const FileTypeBadge = forwardRef<HTMLSpanElement, FileTypeBadgeProps>(function FileTypeBadge(
  { file, className, ...rest },
  ref,
) {
  const ext = (file.split('.').pop() ?? '').toLowerCase();
  const kind = fileKindOf(file);
  const text = EXT_KIND[ext] ? ext.toUpperCase() : 'FILE';
  return <span ref={ref} className={cx('scalar-file-badge', `scalar-file-badge--${kind}`, className)} {...rest}>{text}</span>;
});

/* ---------------------------------------------------------------------------
 * File Type Icon
 * ------------------------------------------------------------------------ */

const KIND_GLYPH: Record<FileKind, () => ReactNode> = {
  pdf: () => <m.PictureAsPdf />,
  word: () => <m.Description />,
  sheet: () => <m.GridOn />,
  image: () => <m.Image />,
  text: () => <m.Article />,
  generic: () => <m.Description />,
};

export interface FileTypeIconProps extends HTMLAttributes<HTMLSpanElement> {
  /** File name or extension ("report.pdf", "xlsx"). */
  file: string;
}

/**
 * File Type Icon — the quieter sibling of File Type Badge: a format glyph in
 * the File/* text colour, for dense single-line lists. Decorative; the file
 * name next to it carries the extension (R8).
 */
export const FileTypeIcon = forwardRef<HTMLSpanElement, FileTypeIconProps>(function FileTypeIcon(
  { file, className, ...rest },
  ref,
) {
  const kind = fileKindOf(file);
  return (
    <span ref={ref} aria-hidden className={cx('scalar-file-icon', `scalar-file-icon--${kind}`, className)} {...rest}>
      <Icon size="s" tone="inherit">{KIND_GLYPH[kind]()}</Icon>
    </span>
  );
});

/* ---------------------------------------------------------------------------
 * File Row
 * ------------------------------------------------------------------------ */

export interface FileRowProps extends Omit<HTMLAttributes<HTMLDivElement>, 'draggable'> {
  name: string;
  /** Meta chips: uploader, date, linked area. */
  meta?: ReadonlyArray<{ icon?: ReactNode; label: ReactNode }>;
  /**
   * The row is the open / current file. Exposed as `aria-current`. This is the
   * "which file am I looking at" state; `checked` is the separate bulk-selection state.
   */
  selected?: boolean;
  /** Bulk-selection checkbox, controlled. The checkbox shows when this, `defaultChecked` or `onCheckedChange` is given. */
  checked?: boolean;
  /** Bulk-selection checkbox, uncontrolled initial value. */
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  /** Shows the drag handle (move between folders). */
  draggable?: boolean;
  /**
   * Keyboard / assistive alternative to dragging (WCAG 2.5.7). When given with
   * `draggable`, the handle becomes a "Move" button that calls this.
   */
  onMove?: () => void;
  onOpen?: () => void;
  onDownload?: () => void;
  /** Opens a Context Menu (Rename, Move, Link to…, Delete). */
  onMenu?: () => void;
  /** Glyph for the download action (default `download`), e.g. `icons.CloudDownload`. */
  downloadIcon?: ReactNode;
  /**
   * `stacked` (default): meta chips on a second line under the name.
   * `inline`: one line — name on the left, meta chips right-aligned.
   */
  layout?: 'stacked' | 'inline';
  /** `badge` (default): the coloured extension badge. `icon`: a File Type Icon. */
  typeIndicator?: 'badge' | 'icon';
}

/** File Row — one document in a file list or folder. */
export const FileRow = forwardRef<HTMLDivElement, FileRowProps>(function FileRow(
  { name, meta, selected, checked, defaultChecked, onCheckedChange, draggable, onMove, onOpen, onDownload, onMenu, downloadIcon, layout = 'stacked', typeIndicator = 'badge', className, ...rest },
  ref,
) {
  const [isChecked, setChecked] = useControllableState(checked, !!defaultChecked, onCheckedChange);
  const showCheckbox = onCheckedChange != null || checked !== undefined || defaultChecked !== undefined;
  return (
    <div ref={ref} aria-current={selected ? 'true' : undefined} className={cx('scalar-file-row', layout === 'inline' && 'scalar-file-row--inline', selected && 'scalar-file-row--selected', className)} {...rest}>
      {showCheckbox && <CheckboxItem size="s" checked={isChecked} onChange={(e) => setChecked(e.target.checked)} aria-label={`Select ${name}`} />}
      {draggable && (onMove
        ? <ButtonIcon variant="tertiary" size="s" label={`Move ${name}`} onClick={onMove} icon={<Icon size="xs" tone="inherit"><DragHandle /></Icon>} />
        : <span className="scalar-file-row__drag" aria-hidden><Icon size="xs" tone="inherit"><DragHandle /></Icon></span>)}
      {typeIndicator === 'icon' ? <FileTypeIcon file={name} /> : <FileTypeBadge file={name} />}
      <button type="button" className="scalar-file-row__main" onClick={onOpen}>
        <span className="scalar-file-row__name">{name}</span>
        {meta && (
          <span className="scalar-file-row__meta">
            {meta.map((m, i) => <span key={typeof m.label === 'string' ? `${m.label}-${i}` : i} className="scalar-file-row__chip">{m.icon}{m.label}</span>)}
          </span>
        )}
      </button>
      {onDownload && <ButtonIcon variant="tertiary" size="s" label={`Download ${name}`} onClick={onDownload} icon={<Icon size="s" tone="inherit">{downloadIcon ?? <Download />}</Icon>} />}
      {onMenu && <ButtonIcon variant="tertiary" size="s" label={`${name} options`} onClick={onMenu} icon={<Icon size="s" tone="inherit"><MoreVertical /></Icon>} />}
    </div>
  );
});

/* ---------------------------------------------------------------------------
 * Tree Item
 * ------------------------------------------------------------------------ */

export interface TreeItemProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onSelect' | 'children'> {
  children: ReactNode;
  type: 'folder' | 'file';
  /** 0-based depth; sets the indent and `aria-level`. */
  level?: number;
  /** Folders only. */
  expanded?: boolean;
  /** Folders: expand/collapse (click, Enter, Space, Left/Right). */
  onToggle?: () => void;
  /** Folders only — document count shown after the name. */
  count?: ReactNode;
  /** Files only — the file name for the badge. */
  fileName?: string;
  selected?: boolean;
  /** Files: fires on click, Enter or Space. (Folders toggle instead.) */
  onSelect?: () => void;
  /** Folders only — replaces the folder glyph, e.g. `icons.Domain` for a company node. */
  icon?: ReactNode;
  /** Overrides the position among siblings. Computed from the surrounding tree when omitted. */
  posInSet?: number;
  /** Overrides the sibling count. Computed from the surrounding tree when omitted. */
  setSize?: number;
}

const treeItemsOf = (tree: Element): HTMLElement[] => Array.from(tree.querySelectorAll<HTMLElement>('[role="treeitem"]'));
const levelOf = (el: HTMLElement) => Number(el.getAttribute('aria-level') ?? 1);

/** Fills `aria-posinset` / `aria-setsize` for items that were not given them explicitly. */
function syncSetPositions(tree: Element) {
  const items = treeItemsOf(tree);
  items.forEach((item, i) => {
    if (item.hasAttribute('data-explicit-set')) return;
    const level = levelOf(item);
    let start = i;
    while (start > 0 && levelOf(items[start - 1]!) >= level) start -= 1;
    let end = i;
    while (end < items.length - 1 && levelOf(items[end + 1]!) >= level) end += 1;
    const siblings = items.slice(start, end + 1).filter((el) => levelOf(el) === level);
    item.setAttribute('aria-posinset', String(siblings.indexOf(item) + 1));
    item.setAttribute('aria-setsize', String(siblings.length));
  });
}

/** Keeps exactly one tree item in the tab order. */
function ensureTabStop(tree: Element) {
  const items = treeItemsOf(tree);
  if (!items.length || items.some((el) => el.getAttribute('tabindex') === '0')) return;
  (items.find((el) => el.getAttribute('aria-selected') === 'true') ?? items[0]!).setAttribute('tabindex', '0');
}

let typeaheadText = '';
let typeaheadTimer: ReturnType<typeof setTimeout> | undefined;

/**
 * Tree Item — row of a folder/file tree (Documents: measurement date →
 * company → subfolder → file). Render inside an element with `role="tree"`
 * (give it an `aria-label`).
 *
 * The row itself is the single focusable `treeitem` (roving tabindex: one tab
 * stop per tree). Keyboard, per the APG tree pattern: Up/Down move between
 * visible items, Right expands a closed folder or enters an open one, Left
 * collapses an open folder or moves to the parent, Home/End jump to first/last,
 * Enter/Space activate, and typing a letter jumps to the next item starting
 * with it. `aria-level`, `aria-posinset` and `aria-setsize` are derived from
 * the rendered tree unless you pass `posInSet`/`setSize`. A tree here is a
 * flat run of rows linked by `level`; wrap a folder's children in
 * `role="group"` if you nest them in the DOM.
 */
export const TreeItem = forwardRef<HTMLDivElement, TreeItemProps>(function TreeItem(
  { children, type, level = 0, expanded, onToggle, count, fileName, selected, onSelect, icon, posInSet, setSize, className, onClick, onKeyDown, onFocus, ...rest },
  ref,
) {
  const localRef = useRef<HTMLDivElement | null>(null);
  const setRefs = useCallback((node: HTMLDivElement | null) => {
    localRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) (ref as { current: HTMLDivElement | null }).current = node;
  }, [ref]);

  // No dependency list: positions depend on siblings, which this item cannot see change.
  useIsomorphicLayoutEffect(() => {
    const tree = localRef.current?.closest('[role="tree"]');
    if (!tree) return;
    ensureTabStop(tree);
    syncSetPositions(tree);
  });
  useEffect(() => {
    const node = localRef.current;
    const tree = node?.closest('[role="tree"]');
    return () => {
      if (!tree) return;
      // Re-number and re-seat the tab stop once this item has left the DOM.
      queueMicrotask(() => {
        if (tree.isConnected) { ensureTabStop(tree); syncSetPositions(tree); }
      });
    };
  }, []);

  const activate = () => (type === 'folder' ? onToggle?.() : onSelect?.());

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(e);
    if (e.defaultPrevented || e.target !== e.currentTarget) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const tree = e.currentTarget.closest('[role="tree"]');
    if (!tree) return;
    const items = treeItemsOf(tree);
    const index = items.indexOf(e.currentTarget);
    const move = (target?: HTMLElement) => {
      if (!target) return;
      e.preventDefault();
      items.forEach((el) => el.setAttribute('tabindex', el === target ? '0' : '-1'));
      target.focus();
    };
    switch (e.key) {
      case 'ArrowDown': move(items[index + 1]); break;
      case 'ArrowUp': move(items[index - 1]); break;
      case 'Home': move(items[0]); break;
      case 'End': move(items[items.length - 1]); break;
      case 'ArrowRight':
        if (type === 'folder') {
          if (!expanded) { e.preventDefault(); onToggle?.(); }
          else if (items[index + 1] && levelOf(items[index + 1]!) > levelOf(e.currentTarget)) move(items[index + 1]);
        }
        break;
      case 'ArrowLeft':
        if (type === 'folder' && expanded) { e.preventDefault(); onToggle?.(); }
        else {
          const here = levelOf(e.currentTarget);
          move([...items.slice(0, index)].reverse().find((el) => levelOf(el) < here));
        }
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        activate();
        break;
      default:
        if (e.key.length === 1) {
          clearTimeout(typeaheadTimer);
          typeaheadText += e.key.toLowerCase();
          typeaheadTimer = setTimeout(() => { typeaheadText = ''; }, 500);
          const label = (el: HTMLElement) => (el.querySelector('.scalar-tree-item__label')?.textContent ?? '').trim().toLowerCase();
          const ordered = [...items.slice(index + 1), ...items.slice(0, index + 1)];
          move(ordered.find((el) => label(el).startsWith(typeaheadText)));
        }
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLDivElement>) => {
    onFocus?.(e);
    const tree = e.currentTarget.closest('[role="tree"]');
    if (!tree) return;
    treeItemsOf(tree).forEach((el) => el.setAttribute('tabindex', el === e.currentTarget ? '0' : '-1'));
  };

  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    onClick?.(e);
    if (!e.defaultPrevented) activate();
  };

  const explicitSet = posInSet != null || setSize != null;
  return (
    // The treeitem is the one focusable element; keyboard handling follows the APG tree pattern above.
    <div
      ref={setRefs}
      role="treeitem"
      tabIndex={-1}
      aria-level={level + 1}
      aria-expanded={type === 'folder' ? !!expanded : undefined}
      aria-selected={!!selected}
      aria-posinset={posInSet}
      aria-setsize={setSize}
      data-explicit-set={explicitSet ? '' : undefined}
      className={cx('scalar-tree-item', `scalar-tree-item--l${Math.min(level, 3)}`, selected && 'scalar-tree-item--selected', className)}
      {...rest}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
    >
      {type === 'folder' ? (
        <span className="scalar-tree-item__toggle" aria-hidden>
          <Icon size="s" tone="inherit">{expanded ? <ChevronDown /> : <ChevronRight />}</Icon>
        </span>
      ) : (
        <span className="scalar-tree-item__spacer" aria-hidden />
      )}
      {type === 'folder' ? <Icon size="s" tone="brand">{icon ?? <Folder />}</Icon> : <FileTypeBadge file={fileName ?? String(children)} />}
      <span className="scalar-tree-item__label">{children}</span>
      {type === 'folder' && count != null && <span className="scalar-tree-item__count">{count}</span>}
    </div>
  );
});

/** Wraps a folder's child rows when you nest them in the DOM; `role="group"` per the tree pattern. */
export const TreeGroup = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function TreeGroup(props, ref) {
  return <div ref={ref} role="group" {...props} />;
});

/* ---------------------------------------------------------------------------
 * Viewer chrome
 * ------------------------------------------------------------------------ */

export interface PageStepperProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  page: number;
  total: number;
  onChange: (page: number) => void;
}

/**
 * Page Stepper — page navigation for a paged document. Type a number and press
 * Enter (or leave the field) to jump; out-of-range numbers clamp, non-numbers
 * revert. The new page is announced politely and focus stays in the field.
 */
export const PageStepper = forwardRef<HTMLDivElement, PageStepperProps>(function PageStepper(
  { page, total, onChange, className, ...rest },
  ref,
) {
  const totalId = useId();
  // `null` = not editing: show the current page.
  const [draft, setDraft] = useState<string | null>(null);
  const go = (n: number) => onChange(Math.min(total, Math.max(1, n)));
  const commit = () => {
    if (draft === null) return;
    const n = Number.parseInt(draft, 10);
    if (Number.isFinite(n) && n !== page) go(n);
    setDraft(null);
  };
  const invalid = draft !== null && draft.trim() !== '' && !/^\d+$/.test(draft.trim());
  return (
    <div ref={ref} className={cx('scalar-page-stepper', className)} {...rest}>
      <ButtonIcon variant="tertiary" size="s" label="Previous page" disabled={page <= 1} onClick={() => go(page - 1)} icon={<Icon size="s" tone="inherit"><ChevronLeft /></Icon>} />
      <input
        className="scalar-page-stepper__input"
        aria-label="Page number"
        aria-describedby={totalId}
        aria-invalid={invalid || undefined}
        inputMode="numeric"
        pattern="[0-9]*"
        value={draft ?? String(page)}
        onChange={(e) => setDraft(e.currentTarget.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          else if (e.key === 'Escape') setDraft(null);
        }}
      />
      <span id={totalId} className="scalar-page-stepper__total">/ {total}</span>
      <ButtonIcon variant="tertiary" size="s" label="Next page" disabled={page >= total} onClick={() => go(page + 1)} icon={<Icon size="s" tone="inherit"><ChevronRight /></Icon>} />
      <VisuallyHidden role="status" aria-live="polite">{`Page ${page} of ${total}`}</VisuallyHidden>
    </div>
  );
});

export interface ZoomControlProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** Percent. */
  value: number;
  onChange: (value: number) => void;
  onFit?: () => void;
  steps?: readonly number[];
}

const DEFAULT_ZOOM_STEPS: readonly number[] = [50, 75, 100, 125, 150, 200];

/** Zoom Control — zoom out / level / zoom in / Fit (Material `zoom_in`, `fit_screen`). The level is announced politely. */
export const ZoomControl = forwardRef<HTMLDivElement, ZoomControlProps>(function ZoomControl(
  { value, onChange, onFit, steps = DEFAULT_ZOOM_STEPS, className, ...rest },
  ref,
) {
  const next = steps.find((s) => s > value);
  const prev = [...steps].reverse().find((s) => s < value);
  return (
    <div ref={ref} role="group" aria-label="Zoom" className={cx('scalar-zoom', className)} {...rest}>
      <ButtonIcon variant="tertiary" size="s" label="Zoom out" disabled={prev == null} onClick={() => prev != null && onChange(prev)} icon={<Icon size="s" tone="inherit"><ZoomOut /></Icon>} />
      <span className="scalar-zoom__value" role="status" aria-live="polite">{value}%</span>
      <ButtonIcon variant="tertiary" size="s" label="Zoom in" disabled={next == null} onClick={() => next != null && onChange(next)} icon={<Icon size="s" tone="inherit"><m.ZoomIn /></Icon>} />
      {onFit && <><span className="scalar-zoom__sep" aria-hidden /><Button variant="tertiary" size="s" leadingIcon={<Icon size="s" tone="inherit"><m.FitScreen /></Icon>} onClick={onFit}>Fit</Button></>}
    </div>
  );
});

export interface DocumentViewerHeaderProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  fileName: string;
  meta?: ReactNode;
  onDownload?: () => void;
  onCopyLink?: () => void;
  onRename?: () => void;
  onDelete?: () => void;
  onExpand?: () => void;
  onClose?: () => void;
  /** Heading level of the file name. Default 2. */
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
}

function ViewerAction({ label, glyph, onClick, tone = 'main' }: { label: string; glyph: ReactNode; onClick?: () => void; tone?: 'main' | 'negative' }) {
  if (!onClick) return null;
  return <ButtonIcon variant="tertiary" tone={tone} size="s" label={label} onClick={onClick} icon={<Icon size="s" tone="inherit">{glyph}</Icon>} />;
}

/**
 * Document Viewer Header — file badge, name (a heading) and meta, then file
 * actions (Download, Copy link, Rename, Delete — negative) and pane actions
 * (Expand, Close). Only the actions you pass are rendered; file actions are
 * named for the file ("Download report.pdf").
 */
export const DocumentViewerHeader = forwardRef<HTMLDivElement, DocumentViewerHeaderProps>(function DocumentViewerHeader(
  { fileName, meta, onDownload, onCopyLink, onRename, onDelete, onExpand, onClose, headingLevel = 2, className, ...rest },
  ref,
) {
  const Heading = `h${headingLevel}` as const;
  return (
    <div ref={ref} className={cx('scalar-viewer-header', className)} {...rest}>
      <FileTypeBadge file={fileName} />
      <div className="scalar-viewer-header__text">
        <Heading className="scalar-viewer-header__name">{fileName}</Heading>
        {meta && <div className="scalar-viewer-header__meta">{meta}</div>}
      </div>
      <ViewerAction label={`Download ${fileName}`} glyph={<Download />} onClick={onDownload} />
      <ViewerAction label={`Copy link to ${fileName}`} glyph={<Copy />} onClick={onCopyLink} />
      <ViewerAction label={`Rename ${fileName}`} glyph={<Edit />} onClick={onRename} />
      <ViewerAction label={`Delete ${fileName}`} glyph={<Trash />} onClick={onDelete} tone="negative" />
      {(onExpand || onClose) && <span className="scalar-viewer-header__sep" aria-hidden />}
      <ViewerAction label="Expand" glyph={<Expand />} onClick={onExpand} />
      <ViewerAction label="Close" glyph={<Close />} onClick={onClose} />
    </div>
  );
});

export interface ScrollHintPillProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  direction?: 'down' | 'up';
}

/** Scroll Hint Pill — how much of a long list is out of view ("↓ 17 companies"). */
export const ScrollHintPill = forwardRef<HTMLButtonElement, ScrollHintPillProps>(function ScrollHintPill(
  { children, direction = 'down', className, type = 'button', ...rest },
  ref,
) {
  return (
    <button ref={ref} type={type} className={cx('scalar-scroll-hint', className)} {...rest}>
      <Icon size="xs" tone="inherit">{direction === 'down' ? <ArrowDown /> : <ArrowUp />}</Icon>
      {children}
    </button>
  );
});
