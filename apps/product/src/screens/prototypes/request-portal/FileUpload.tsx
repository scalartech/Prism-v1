/**
 * The compact upload area of an open request (Matt's feedback, Nov 2026):
 *
 * - One file row per file, metadata on one line ("name · Uploaded by you · 4.8 MB · Nov 2, 2026"),
 *   Download and Remove beside it. Long names truncate in the middle so the version and extension
 *   stay visible; the full name is in the tooltip and the buttons' names. At narrow widths the size
 *   goes first, then the uploader; the date always stays.
 * - A one-line upload bar instead of the tall Dropzone. Below the request's `maxFiles` it reads
 *   "Add another file" once a file exists; at a one-file limit it is "Replace file". While a file is
 *   dragged, the whole request card is the drop target (RequestRow), so the small bar costs no precision.
 * - The limits are always visible, from the request's own limits: in the empty bar they are part of
 *   the dropzone line ("Drag & drop or select a file · PDF, Office, CSV · max 250 MB"), elsewhere
 *   beside the action, with every format in a tooltip. The picker's `accept` filters the system dialog;
 *   type and size are checked in the browser before an upload starts (P0.5), because a drop ignores `accept`.
 *
 * Built from DS parts (Button, ButtonIcon, FileTypeBadge, ProgressBar, Tooltip, Text): the DS Dropzone
 * has no one-line variant, and its `accept` silently discards dropped files that don't match.
 */
import { useEffect, useId, useRef, useState, type RefObject } from 'react';
import {
  Button, ButtonIcon, FileTypeBadge, Icon, ProgressBar, Text, Tooltip, color, icons, radius, space,
} from '@scalar/design-system';
import {
  acceptedList, currentFiles, formatBytes, formatDay, maxFilesOf, requirementsLine, type InformationRequest, type UploadedFile,
} from './model.js';
import { REQUEST_META } from './fixtures.js';
import type { OpState, PortalStore } from './store.js';

export type Notify = (tone: 'positive' | 'negative' | 'info', text: string, action?: { label: string; onClick: () => void }) => void;

/** "ABC_Co_Strategy_Board…FINAL_v3.pptx": keeps the start, and the end with its version and extension. */
export function middleTruncate(name: string, max = 44) {
  if (name.length <= max) return name;
  const tail = Math.min(18, Math.floor(max / 2));
  return `${name.slice(0, max - tail - 1)}…${name.slice(-tail)}`;
}

/** Width of an element, for the narrow-width drop order. */
function useWidth(ref: RefObject<HTMLElement | null>) {
  const [w, setW] = useState(Infinity);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => setW(e!.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return w;
}

/** Can this request take a file right now? N/A and "sent another way" must be reopened first. */
export const canUpload = (req: InformationRequest) =>
  (req.responseType === 'file' || req.responseType === 'template_file') && (req.status === 'pending' || req.status === 'complete');

/**
 * Upload files to a request within its limit. Extra files are refused with a message, never dropped
 * silently; uploads run one after another so each shows its own progress.
 */
export function useUploader(req: InformationRequest, store: PortalStore, notify: Notify) {
  return async (files: readonly File[]) => {
    if (!files.length) return;
    const max = maxFilesOf(req);
    const room = max - currentFiles(req).length;
    // One-file requests replace; multi-file requests fill the free slots.
    const take = max === 1 ? files.slice(0, 1) : files.slice(0, Math.max(0, room));
    const refused = files.length - take.length;
    if (refused > 0) {
      notify('negative', max === 1
        ? `This request takes one file, so only ${take[0]!.name} was used.`
        : room <= 0
          ? `This request already has its ${max} files. Remove one to add another.`
          : `This request takes up to ${max} files, so ${refused} file${refused === 1 ? ' was' : 's were'} not added.`);
    }
    for (const f of take) await store.uploadFile(req, f);
  };
}

/* ---- one file, one line ---- */

function FileLine({ f, removable, onRemove, onDownload, narrow, veryNarrow }: {
  f: UploadedFile; removable: boolean; onRemove: () => void; onDownload: () => void; narrow: boolean; veryNarrow: boolean;
}) {
  const byYou = f.uploadedBy === REQUEST_META.respondent;
  const shown = middleTruncate(f.name, veryNarrow ? 26 : narrow ? 34 : 48);
  const meta = [
    // Drop order at narrow widths: size first, then the uploader. The date always stays.
    !veryNarrow && { key: 'by', text: `${byYou ? 'Uploaded by you' : `Uploaded by ${f.uploadedBy}`}${f.viaExpress ? ' with Express mode' : ''}`, shrink: true },
    !narrow && { key: 'size', text: formatBytes(f.sizeBytes), shrink: false },
    { key: 'date', text: formatDay(f.uploadedAt), shrink: false },
  ].filter(Boolean) as { key: string; text: string; shrink: boolean }[];
  return (
    <li style={{ listStyle: 'none', display: 'flex', alignItems: 'center', gap: space.s, minWidth: 0, padding: `${space.xs} ${space.s}`, border: `1px solid ${color.stroke.default}`, borderRadius: radius.s, background: color.bg.surface }}>
      <FileTypeBadge file={f.name} />
      {/* One line; on a phone the metadata moves under the name, so the date is never cut. */}
      <span style={{ display: 'flex', flexDirection: veryNarrow ? 'column' : 'row', alignItems: veryNarrow ? 'flex-start' : 'baseline', gap: veryNarrow ? 0 : space.xs, minWidth: 0, flex: '0 1 auto' }}>
        <Tooltip content={f.name} style={{ minWidth: 0, maxWidth: '100%', flex: '0 1 auto', overflow: 'hidden' }}>
          <span style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            <Text as="span" step="s" weight="semiBold" aria-hidden={shown !== f.name ? true : undefined}>{shown}</Text>
            {shown !== f.name && <span className="scalar-visually-hidden">{f.name}</span>}
          </span>
        </Tooltip>
        {/* No minWidth: 0 here, so this group never shrinks below size + date; only the uploader truncates. */}
        <span style={{ display: 'flex', gap: space.xs, maxWidth: '100%', flex: '0 1 auto' }}>
          {meta.map((m, i) => (
            <Text key={m.key} as="span" step="s" tone="secondary" title={m.shrink ? m.text : undefined}
              style={{ whiteSpace: 'nowrap', ...(m.shrink ? { overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0, flex: '0 1 auto' } : { flex: 'none' }) }}>
              {(i > 0 || !veryNarrow) && <span aria-hidden>· </span>}{m.text}
            </Text>
          ))}
        </span>
      </span>
      {/* Actions sit beside the metadata, not at the far edge. */}
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: space['2xs'], flex: 'none' }}>
        <Tooltip content={`Download ${f.name}`}>
          <ButtonIcon variant="tertiary" size="s" label={`Download ${f.name}`} onClick={onDownload} icon={<Icon size="s" tone="inherit"><icons.Download /></Icon>} />
        </Tooltip>
        {removable && (
          <Button variant="tertiary" size="s" tone="negative" aria-label={`Remove ${f.name}`} onClick={onRemove}>Remove</Button>
        )}
      </span>
    </li>
  );
}

/* ---- the file list (no visible label; a hidden heading for screen readers) ---- */

export function UploadedFiles({ req, store, notify, num, editable }: { req: InformationRequest; store: PortalStore; notify: Notify; num: string; editable: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const width = useWidth(ref);
  const [showEarlier, setShowEarlier] = useState(false);
  const files = currentFiles(req);
  const earlier = (req.files ?? []).filter((f) => f.replaced).reverse();
  const headingId = useId();
  if (!files.length && !earlier.length) return <div ref={ref} />;

  const download = async (f: UploadedFile) => {
    if (!(await store.downloadUpload(f))) notify('negative', `${f.name} is not stored in this browser, so it can’t be downloaded in the prototype.`);
  };
  const remove = (f: UploadedFile) => {
    const before = req.status;
    store.removeFile(req.id, f.id);
    notify('info', `${f.name} removed from request ${num}.`, { label: 'Undo', onClick: () => store.restoreFile(req.id, f, before) });
  };
  const line = (f: UploadedFile, removable: boolean) => (
    <FileLine key={f.id} f={f} removable={removable} narrow={width < 560} veryNarrow={width < 400}
      onRemove={() => remove(f)} onDownload={() => void download(f)} />
  );

  return (
    <div ref={ref} style={{ display: 'flex', flexDirection: 'column', gap: space.xs, minWidth: 0 }}>
      <h4 id={headingId} className="scalar-visually-hidden">{`Files uploaded for request ${num}`}</h4>
      {files.length > 1 && <Text step="s" tone="secondary">{files.length} files</Text>}
      {files.length > 0 && (
        <ul aria-labelledby={headingId} style={{ margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: space.xs }}>
          {files.map((f) => line(f, editable))}
        </ul>
      )}
      {earlier.length > 0 && (
        <div>
          <Button variant="tertiary" size="xs" aria-expanded={showEarlier} onClick={() => setShowEarlier((o) => !o)}
            trailingIcon={<Icon size="s" tone="inherit">{showEarlier ? <icons.KeyboardArrowUp /> : <icons.KeyboardArrowDown />}</Icon>}>
            {`Earlier versions (${earlier.length})`}
          </Button>
          {showEarlier && (
            <ul aria-label={`Earlier versions for request ${num}`} style={{ margin: `${space.xs} 0 0`, padding: 0, display: 'flex', flexDirection: 'column', gap: space.xs }}>
              {earlier.map((f) => line(f, false))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/* ---- the one-line upload bar ---- */

export function UploadBar({ req, op, store, notify, onFiles, dragOver, num, label }: {
  req: InformationRequest; op?: OpState; store: PortalStore; notify: Notify; onFiles: (files: File[]) => void; dragOver: boolean; num: string;
  /** What the request asks for, in the prompt ("the completed template"). */
  label?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const reqId = useId();
  const files = currentFiles(req);
  const max = maxFilesOf(req);
  const atLimit = files.length >= max;
  const busy = !!op && (op.phase === 'uploading' || op.phase === 'saving' || op.phase === 'validating');
  const multiple = max - files.length > 1;
  const pick = () => input.current?.click();
  const requirements = requirementsLine(req);
  const accepted = acceptedList(req);

  const picker = (
    <input
      ref={input}
      type="file"
      hidden
      accept={accepted.join(',')}
      multiple={multiple}
      onChange={(e) => { const fs = [...(e.currentTarget.files ?? [])]; e.currentTarget.value = ''; onFiles(fs); }}
    />
  );

  const reqLine = (
    <span id={reqId} style={{ display: 'inline-flex', alignItems: 'center', gap: space['2xs'], minWidth: 0 }}>
      <Text as="span" step="s" tone="secondary">{requirements}</Text>
      <Tooltip content={`Accepted formats: ${accepted.join(', ')}`}>
        <ButtonIcon variant="tertiary" size="xs" label={`Accepted formats for request ${num}: ${accepted.join(', ')}`} icon={<Icon size="xs" tone="inherit"><icons.Info /></Icon>} />
      </Tooltip>
    </span>
  );

  if (busy) {
    const text = op.phase === 'validating' ? `Checking ${op.fileName}…` : op.phase === 'saving' ? `Saving ${op.fileName}…` : `Uploading ${op.fileName}`;
    return (
      <div role="status" style={{ display: 'flex', alignItems: 'center', gap: space.s, flexWrap: 'wrap', padding: `${space.xs} ${space.s}`, border: `1px solid ${color.stroke.brand}`, borderRadius: radius.s, background: color.bg.brandSubtle }}>
        <Icon size="s" tone="brand"><icons.UploadFile /></Icon>
        <Text as="span" step="s" style={{ flex: '1 1 auto', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{text}</Text>
        {op.phase === 'uploading' && <ProgressBar value={op.progress ?? 0} label={`Uploading ${op.fileName}`} style={{ width: `calc(${space['3xl']} * 2)` }} />}
        {op.phase === 'uploading' && <Button variant="tertiary" size="xs" aria-label={`Cancel uploading ${op.fileName}`} onClick={() => { store.cancelUpload(req.id); notify('info', `Upload of ${op.fileName} cancelled. Nothing was added to request ${num}.`); }}>Cancel</Button>}
      </div>
    );
  }

  // Has a file and room for more: a link-weight action, not a second drop area.
  if (files.length > 0 && !atLimit) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: space.s, flexWrap: 'wrap' }}>
        {picker}
        <Button variant="tertiary" size="s" aria-describedby={reqId} leadingIcon={<Icon size="s" tone="inherit"><icons.Add /></Icon>} onClick={pick}>
          Add another file
        </Button>
        <Text as="span" step="s" tone="secondary">{`${files.length} of ${max}`}</Text>
        {reqLine}
      </div>
    );
  }

  // At a multi-file limit there is no single file to replace: say how to make room.
  if (atLimit && max > 1) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: space.s, flexWrap: 'wrap' }}>
        <Icon size="s" tone="secondary"><icons.Info /></Icon>
        <Text as="span" step="s" tone="secondary">{`All ${max} files added. Remove one to add another.`}</Text>
      </div>
    );
  }

  if (atLimit) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: space.s, flexWrap: 'wrap' }}>
        {picker}
        <Button variant="secondary" size="s" aria-describedby={reqId} leadingIcon={<Icon size="s" tone="inherit"><icons.SwapHoriz /></Icon>} onClick={pick}>
          Replace file
        </Button>
        {reqLine}
      </div>
    );
  }

  // Empty: one line, icon inline. The whole card takes drops; this bar is the keyboard and click path.
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: space['2xs'] }}>
      {picker}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: space.s, flexWrap: 'wrap', padding: `${space.xs} ${space.s}`,
          border: `1px dashed ${dragOver ? color.stroke.brand : color.stroke.default}`, borderRadius: radius.s,
          background: dragOver ? color.bg.brandSubtle : color.bg.subtle,
        }}
      >
        <Icon size="s" tone={dragOver ? 'brand' : 'secondary'}><icons.UploadFile /></Icon>
        <Text as="span" step="s">{dragOver ? 'Drop to upload' : <>Drag & drop {label ?? ''} or</>}</Text>
        {!dragOver && (
          <>
            <Button variant="tertiary" size="xs" aria-describedby={reqId} onClick={pick}>{multiple ? 'select files' : 'select a file'}</Button>
            {/* The limits sit in the dropzone line itself, muted, so they are read before a file is dropped. */}
            <Text as="span" id={reqId} step="s" tone="secondary" title={`Accepted formats: ${accepted.join(', ')}`}>
              <span aria-hidden>· </span>{requirements}
            </Text>
          </>
        )}
      </div>
    </div>
  );
}
