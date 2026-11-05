/**
 * One request in the unified list: a compact, always-visible header row and,
 * when expanded, the one response control its `responseType` calls for (G2.2).
 * The disclosure is a real button with `aria-expanded`; the checkbox and the
 * actions sit beside it, never inside it (P1.13).
 */
import { useEffect, useId, useState, type DragEvent, type ReactNode } from 'react';
import {
  Alert, Button, Checkbox, Chip, ConfirmationDialog, FileRow, FormField, Icon, Input, Label, Radio, RadioGroup,
  Text, Textarea, Tooltip, color, glyphs, icons, radius, size, space,
} from '@scalar/design-system';
import { UploadBar, UploadedFiles, canUpload, useUploader, type Notify } from './FileUpload.js';
import {
  activeFollowUp, currentFiles, formatDay, requestNumber, responseTypeLabel, shownStatus, statusLabel,
  type InformationRequest, type RequestStatus,
} from './model.js';
import { EXPRESS_NOTE } from './ExpressMode.js';
import { downloadTemplate, type OpState, type PortalStore } from './store.js';

const statusChip: Record<RequestStatus, { style: 'default' | 'positive' | 'info'; icon: JSX.Element }> = {
  pending: { style: 'default', icon: <icons.Pending /> },
  complete: { style: 'positive', icon: <icons.CheckCircle /> },
  na: { style: 'default', icon: <icons.DoNotDisturbOn /> },
  sent: { style: 'info', icon: <icons.Send /> },
};

const typeIcon: Record<InformationRequest['responseType'], JSX.Element> = {
  text: <icons.EditNote />,
  choice: <icons.Rule />,
  multiple_choice: <icons.FormatListBulleted />,
  date: <icons.CalendarToday />,
  file: <icons.UploadFile />,
  template_file: <icons.TableView />,
};

export function StatusChip({ status, label }: { status: RequestStatus; label?: string }) {
  const s = statusChip[status];
  return (
    <Chip size="s" styleVariant={s.style} leadingIcon={<Icon size="xs" tone="inherit">{s.icon}</Icon>}>
      {label ?? statusLabel[status]}
    </Chip>
  );
}

const fmtDate = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${m}/${d}/${y}`;
};

interface RowProps {
  req: InformationRequest;
  /** Every request, so a row can find its follow-up. */
  all: readonly InformationRequest[];
  expanded: boolean;
  onToggle: () => void;
  selected?: boolean;
  /** Omit to show the row without a selection checkbox (Company · Questions). */
  onSelect?: (checked: boolean) => void;
  store: PortalStore;
  onDelegate: (id: string) => void;
  notify: Notify;
  mobile: boolean;
  /**
   * Whose screen this is. `recipient` (the portal, default): the description
   * stays under the title — it is the instruction. `sender` (the analyst):
   * a collapsed row shows the answer in the description's place, and the
   * answer reads "Answered by …" instead of "Your saved answer".
   */
  viewer?: 'recipient' | 'sender';
  /** Who answered, for the sender's wording. */
  respondent?: string;
}

/**
 * What came back, in one line for a collapsed row (sender view): the value of
 * a Yes / No, the options picked, a date, the first line of a written answer,
 * the file name, or how it was resolved without one. Null while nothing has.
 */
export function answerSummary(req: InformationRequest): { node: ReactNode; text: string } | null {
  if (req.status === 'na') return { node: 'Marked N/A', text: 'Marked N/A' };
  if (req.status === 'sent') return { node: 'Sent another way', text: 'Sent another way' };
  switch (req.responseType) {
    case 'choice': {
      if (!req.answer) return null;
      const v = req.answer === 'yes' ? 'Yes' : 'No';
      return { node: <Chip size="s">{v}</Chip>, text: v };
    }
    case 'multiple_choice': {
      const sel = req.selection;
      if (!sel?.optionIds.length) return null;
      const labels = (req.choice?.options ?? []).filter((o) => sel.optionIds.includes(o.id))
        .map((o) => (o.other && sel.otherText ? `${o.label}: ${sel.otherText}` : o.label));
      const text = labels.length > 2 ? `${labels.slice(0, 2).join(', ')} +${labels.length - 2}` : labels.join(', ');
      return { node: text, text: labels.join(', ') };
    }
    case 'date': return req.answer ? { node: formatDay(req.answer), text: formatDay(req.answer) } : null;
    case 'text': return req.answer ? { node: req.answer.split('\n')[0], text: req.answer } : null;
    default: {
      const files = currentFiles(req);
      if (!files.length) return null;
      const more = files.length > 1 ? ` +${files.length - 1} file${files.length > 2 ? 's' : ''}` : '';
      return {
        node: <Chip size="s" leadingIcon={<Icon size="xs" tone="inherit"><icons.Description /></Icon>}>{`${files[0]!.name}${more}`}</Chip>,
        text: files.map((f) => f.name).join(', '),
      };
    }
  }
}

export function RequestRow({ req, all, expanded, onToggle, selected = false, onSelect, store, onDelegate, notify, mobile, viewer = 'recipient', respondent }: RowProps) {
  const num = requestNumber(req);
  const panelId = `req-panel-${req.id}`;
  const op = store.ops[req.id];
  // Reopen is offered for any saved outcome, including a saved answer whose follow-up is still open.
  const resolved = req.status !== 'pending';
  const followUp = req.status === 'pending' || req.status === 'complete' ? activeFollowUp(req, all) : undefined;
  const status = shownStatus(req, all);
  const waitingOnFollowUp = req.status === 'complete' && status === 'pending';
  // The sender reads answers without opening rows: the answer takes the description's slot while collapsed.
  const answer = viewer === 'sender' && !expanded ? answerSummary(req) : null;
  const when = req.updatedAt ?? currentFiles(req)[0]?.uploadedAt;
  const savedLabel = viewer === 'sender' ? `Answered by ${respondent ?? 'the recipient'}${when ? ` · ${formatDay(when)}` : ''}` : undefined;
  const ids = { num: useId(), title: useId(), note: useId(), details: useId(), type: useId() };

  // While a file is dragged over it, the whole request card is the drop target (the upload bar is small).
  const [dragOver, setDragOver] = useState(false);
  const upload = useUploader(req, store, notify);
  const droppable = canUpload(req) && !(op && op.phase !== 'failed');
  const cardDrop = droppable ? {
    'data-file-drop': '',
    onDragOver: (e: DragEvent) => { if (!e.dataTransfer.types.includes('Files')) return; e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; setDragOver(true); },
    onDragLeave: (e: DragEvent) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false); },
    onDrop: (e: DragEvent) => {
      if (!e.dataTransfer.files.length) return;
      e.preventDefault();
      setDragOver(false);
      if (!expanded) onToggle(); // open it, so progress and any error are visible
      void upload([...e.dataTransfer.files]);
    },
  } : {};

  return (
    <li
      {...cardDrop}
      style={{
        listStyle: 'none',
        borderBottom: `1px solid ${color.stroke.divider}`,
        background: dragOver || selected ? color.bg.brandSubtle : expanded ? color.bg.surface : undefined,
        outline: dragOver ? `2px dashed ${color.stroke.brand}` : undefined,
        outlineOffset: dragOver ? `-${space['2xs']}` : undefined,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: space.s, paddingInline: space.s, minHeight: size.target.minimum }}>
        {onSelect && <Checkbox size="s" checked={selected} onChange={(e) => onSelect(e.currentTarget.checked)} aria-label={`Select request ${num}`} />}
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-controls={panelId}
          // Name: number and title. The short note and response type describe it (read after the name).
          aria-labelledby={`${ids.num} ${ids.title}`}
          aria-describedby={[(answer || req.shortNote) && ids.note, ids.type].filter(Boolean).join(' ')}
          className="scalar-focusable"
          style={{
            flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: space.s, padding: `${space.xs} 0`,
            background: 'none', border: 0, textAlign: 'left', cursor: 'pointer', color: 'inherit', font: 'inherit',
            minHeight: size.target.minimum,
          }}
        >
          <Text as="span" id={ids.num} step="s" weight="semiBold" tone="secondary" style={{ minWidth: space['2xl'], fontVariantNumeric: 'tabular-nums' }}>{num}</Text>
          <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: mobile ? 'column' : 'row', alignItems: mobile ? 'flex-start' : 'center', gap: mobile ? space['2xs'] : space.m }}>
            {/* The title leads; the short note follows on the same line, muted, and truncates first. Open, it wraps in full (onto its own line if narrow). */}
            <span style={{ flex: 1, minWidth: 0, maxWidth: '100%', display: 'flex', alignItems: 'baseline', gap: space.s, flexWrap: expanded ? 'wrap' : 'nowrap' }}>
              <Text as="span" id={ids.title} step="m" weight={expanded ? 'semiBold' : 'regular'} style={{ flex: '0 1 auto', minWidth: 0 }}>{req.title}</Text>
              {answer ? (
                <Tooltip content={answer.text} style={{ minWidth: 0, flex: '1 1 0', display: 'flex' }}>
                  <Text as="span" id={ids.note} step="s" tone="primary" style={{ display: 'inline-flex', alignItems: 'center', gap: space.xs, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>
                    <span aria-hidden>· </span><span className="scalar-visually-hidden">Answer: </span>
                    <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{answer.node}</span>
                  </Text>
                </Tooltip>
              ) : req.shortNote && (
                <Tooltip content={req.shortNote} style={{ minWidth: 0, flex: expanded ? '1 1 24ch' : '1 1 0', display: 'flex' }}>
                  <Text as="span" id={ids.note} step="s" tone="secondary"
                    style={expanded ? undefined : { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>
                    <span aria-hidden>· </span>{req.shortNote}
                  </Text>
                </Tooltip>
              )}
            </span>
            <span id={ids.type} style={{ display: 'inline-flex', alignItems: 'center', gap: space.xs, flex: 'none' }}>
              <Icon size="xs" tone="secondary">{typeIcon[req.responseType]}</Icon>
              <Text as="span" step="s" tone="secondary">{responseTypeLabel[req.responseType]}</Text>
            </span>
          </span>
          <Icon size="s" tone="secondary">{expanded ? <icons.KeyboardArrowUp /> : <icons.KeyboardArrowDown />}</Icon>
        </button>
        {req.delegatee && !mobile && (
          <Chip size="s" leadingIcon={<Icon size="xs" tone="inherit"><icons.Person /></Icon>}>{req.delegatee}</Chip>
        )}
        {op && op.phase !== 'idle' && op.phase !== 'failed' && (
          <Text as="span" step="s" tone="brand" role="status">{op.phase === 'saving' ? 'Saving…' : op.phase === 'validating' ? 'Checking…' : `Uploading ${op.progress ?? 0}%`}</Text>
        )}
        {dragOver && !expanded && <Text as="span" step="s" tone="brand" weight="semiBold">Drop to upload</Text>}
        <StatusChip status={status} label={waitingOnFollowUp ? 'Follow-up needed' : undefined} />
      </div>

      {expanded && (
        <div
          id={panelId}
          role="region"
          aria-label={`Request ${num}`}
          style={{ display: 'flex', flexDirection: 'column', gap: space.m, padding: `${space.xs} ${space.l} ${space.l}`, paddingLeft: mobile ? space.l : `calc(${space['2xl']} + ${space['3xl']})` }}
        >
          {req.details && <Text id={ids.details} step="m" tone="secondary">{req.details}</Text>}
          {/* Where the response came from stays visible, to the recipient and the sender. */}
          {(req.answeredViaExpress || currentFiles(req).some((f) => f.viaExpress)) && (
            <div><Chip size="s" styleVariant="ai" leadingIcon={<Icon size="xs" tone="inherit"><glyphs.AiMark /></Icon>}>{EXPRESS_NOTE}</Chip></div>
          )}
          {req.delegatee && mobile && <Text step="s" tone="secondary">Delegated to {req.delegatee}</Text>}

          {(req.status === 'na' || req.status === 'sent') && (
            <Alert tone="info" title={req.status === 'na' ? 'Marked as not applicable' : 'Marked complete — sent another way'}>
              {req.status === 'na'
                ? 'No response is expected for this request. Reopen it if that changes.'
                : 'You told the analyst this was delivered outside the portal. No file was uploaded here.'}
            </Alert>
          )}

          <Response req={req} op={op} store={store} notify={notify} all={all} dragOver={dragOver} onFiles={(fs) => void upload(fs)} savedLabel={savedLabel} />

          {op?.phase === 'failed' && (
            <Alert tone="negative" title="Not saved" onDismiss={() => store.clearError(req.id)} dismissLabel="Dismiss error">
              {op.error}
            </Alert>
          )}

          {followUp && <FollowUp req={followUp} store={store} notify={notify} all={all} />}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: space.s, paddingTop: space.xs }}>
            {resolved ? (
              <Button variant="secondary" size="s" leadingIcon={<Icon size="s" tone="inherit"><icons.Undo /></Icon>} onClick={() => { store.reopen([req.id]); notify('info', `Request ${num} reopened. Your saved response is still attached.`); }}>
                Reopen
              </Button>
            ) : (
              <>
                {/* Short labels; the tooltip explains each outcome for first-time users. */}
                <Tooltip position="right" content="Mark as not applicable, such as when it isn’t available or doesn’t apply to your business.">
                  <Button variant="tertiary" size="s" leadingIcon={<Icon size="s" tone="inherit"><icons.DoNotDisturbOn /></Icon>} onClick={() => { store.setStatus([req.id], 'na'); notify('info', `Request ${num} marked as not applicable.`); }}>
                    N/A
                  </Button>
                </Tooltip>
                <Tooltip content="Mark as complete, such as when you sent it offline or another way.">
                  <Button variant="tertiary" size="s" leadingIcon={<Icon size="s" tone="inherit"><icons.Send /></Icon>} onClick={() => { store.setStatus([req.id], 'sent'); notify('info', `Request ${num} marked complete — sent another way.`); }}>
                    Complete
                  </Button>
                </Tooltip>
              </>
            )}
            <Button variant="tertiary" size="s" leadingIcon={<Icon size="s" tone="inherit"><icons.PersonAdd /></Icon>} onClick={() => onDelegate(req.id)}>
              {req.delegatee ? 'Change delegate' : 'Delegate'}
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}

/* ---------------------------------------------------------------------------
 * Response renderers — one per response type (P1.9)
 * ------------------------------------------------------------------------ */

interface ResponseProps {
  req: InformationRequest; op?: OpState; store: PortalStore; notify: Notify; all: readonly InformationRequest[];
  /** Upload within the request's file limit (shared with the card's drop target). */
  onFiles: (files: File[]) => void;
  dragOver: boolean;
  /** Heading over a saved answer. Default "Your saved answer" (the recipient's wording). */
  savedLabel?: string;
}

/**
 * A follow-up, shown inside its parent once the parent's saved answer calls for
 * it. Any response type; it has its own number (2.5a), save and errors.
 */
function FollowUp({ req, store, notify, all }: Omit<ResponseProps, 'op' | 'onFiles' | 'dragOver'>) {
  const op = store.ops[req.id];
  const upload = useUploader(req, store, notify);
  const num = requestNumber(req);
  return (
    <section
      aria-label={`Follow-up ${num}`}
      style={{ display: 'flex', flexDirection: 'column', gap: space.s, padding: space.m, borderLeft: `2px solid ${color.stroke.brand}`, background: color.bg.subtle, borderRadius: `0 ${radius.xs} ${radius.xs} 0` }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: space.s, flexWrap: 'wrap' }}>
        <Text as="span" step="s" weight="semiBold" tone="secondary">Follow-up {num}</Text>
        <StatusChip status={req.status} />
      </div>
      <Text step="m" weight="semiBold">{req.title}{req.shortNote && <Text as="span" step="s" tone="secondary"> · {req.shortNote}</Text>}</Text>
      {req.details && <Text step="s" tone="secondary">{req.details}</Text>}
      <Response req={req} op={op} store={store} notify={notify} all={all} onFiles={(fs) => void upload(fs)} dragOver={false} />
      {op?.phase === 'failed' && (
        <Alert tone="negative" title="Not saved" onDismiss={() => store.clearError(req.id)} dismissLabel="Dismiss error">{op.error}</Alert>
      )}
      {req.status !== 'pending' && (
        <div>
          <Button variant="tertiary" size="s" leadingIcon={<Icon size="s" tone="inherit"><icons.Undo /></Icon>} onClick={() => store.reopen([req.id])}>
            Edit follow-up
          </Button>
        </div>
      )}
    </section>
  );
}

function Response(props: ResponseProps) {
  switch (props.req.responseType) {
    case 'text': return <AnswerResponse {...props} kind="text" />;
    case 'choice': return <AnswerResponse {...props} kind="choice" />;
    case 'multiple_choice': return <ChoiceResponse {...props} />;
    case 'date': return <AnswerResponse {...props} kind="date" />;
    case 'file': return <FileResponse {...props} />;
    case 'template_file': return <TemplateResponse {...props} />;
  }
}

function AnswerResponse({ req, op, store, kind, savedLabel = 'Your saved answer' }: ResponseProps & { kind: 'text' | 'choice' | 'date' }) {
  // Restores the saved value when reopened (P1.4); what was typed survives a failed save.
  const [draft, setDraft] = useState(req.answer ?? '');
  useEffect(() => { setDraft(req.answer ?? ''); }, [req.answer]);
  const saving = op?.phase === 'saving';
  const readOnly = req.status !== 'pending';

  if (readOnly) {
    if (!req.answer) return null;
    const shown = kind === 'choice' ? (req.answer === 'yes' ? 'Yes' : 'No') : kind === 'date' ? fmtDate(req.answer) : req.answer;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: space.xs }}>
        <Text step="s" tone="secondary">{savedLabel}</Text>
        <Text step="m" style={{ whiteSpace: 'pre-wrap' }}>{shown}</Text>
      </div>
    );
  }

  const control =
    kind === 'text' ? (
      <FormField label="Your answer">
        <Textarea rows={3} value={draft} onChange={(e) => setDraft(e.currentTarget.value)} disabled={saving} />
      </FormField>
    ) : kind === 'choice' ? (
      <RadioGroup label="Your answer" value={draft || undefined} onValueChange={setDraft} disabled={saving}>
        <div style={{ display: 'flex', gap: space.l }}>
          <Radio value="yes">Yes</Radio>
          <Radio value="no">No</Radio>
        </div>
      </RadioGroup>
    ) : (
      <FormField label="Date" helperText="MM/DD/YYYY">
        <Input type="date" value={draft} onChange={(e) => setDraft(e.currentTarget.value)} disabled={saving} />
      </FormField>
    );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: space.s, alignItems: 'stretch' }}>
      <div style={{ maxWidth: kind === 'text' ? undefined : 'max-content' }}>{control}</div>
      <div>
        <Button size="s" loading={saving} disabled={!draft.trim() || saving || (draft === req.answer && req.status === 'complete')} onClick={() => store.saveAnswer(req.id, draft.trim())}>
          {op?.phase === 'failed' ? 'Try again' : req.answer ? 'Save changes' : 'Save answer'}
        </Button>
      </div>
    </div>
  );
}

/**
 * Multiple choice: radios to pick one, checkboxes to select all that apply.
 * An "Other" option asks for text. Saving can add a follow-up; a change that
 * drops a follow-up which already has an answer asks first, then clears it.
 */
function ChoiceResponse({ req, op, store, all, savedLabel = 'Your saved answer' }: ResponseProps) {
  const cfg = req.choice!;
  const [ids, setIds] = useState<string[]>(req.selection?.optionIds ?? []);
  const [other, setOther] = useState(req.selection?.otherText ?? '');
  const [touched, setTouched] = useState(false);
  const [confirm, setConfirm] = useState<InformationRequest[] | null>(null);
  useEffect(() => { setIds(req.selection?.optionIds ?? []); setOther(req.selection?.otherText ?? ''); }, [req.selection]);

  const saving = op?.phase === 'saving';
  const labelId = `choice-label-${req.id}`;
  const otherOption = cfg.options.find((o) => o.other);
  const otherPicked = !!otherOption && ids.includes(otherOption.id);
  const otherMissing = otherPicked && !other.trim();
  const followUps = all.filter((f) => f.parentId === req.id);
  const wouldAdd = followUps.find((f) => (f.showWhen ?? []).some((id) => ids.includes(id)) && f !== activeFollowUp(req, all));

  if (req.status !== 'pending') {
    if (!req.selection) return null;
    const labels = cfg.options.filter((o) => req.selection!.optionIds.includes(o.id))
      .map((o) => (o.other && req.selection!.otherText ? `${o.label}: ${req.selection!.otherText}` : o.label));
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: space.xs }}>
        <Text step="s" tone="secondary">{savedLabel}</Text>
        {labels.map((l) => <Text key={l} step="m">{l}</Text>)}
      </div>
    );
  }

  const save = (clearIds: string[] = []) => {
    const selection = { optionIds: ids, otherText: otherPicked ? other.trim() : undefined };
    void store.saveSelection(req.id, selection, clearIds);
  };
  const onSave = () => {
    setTouched(true);
    if (!ids.length || otherMissing) return;
    // Follow-ups this choice no longer calls for, that already hold an answer.
    const dropped = followUps.filter((f) => !(f.showWhen ?? []).some((id) => ids.includes(id))
      && (f.status !== 'pending' || f.answer || f.selection || f.files?.length));
    if (dropped.length) setConfirm(dropped); else save();
  };

  const otherField = otherPicked && (
    <div style={{ paddingLeft: space.xl }}>
      <FormField label="Please specify" required state={touched && otherMissing ? 'error' : 'default'}
        helperText={touched && otherMissing ? 'Describe your “Other” answer to save.' : undefined}>
        <Input value={other} onChange={(e) => setOther(e.currentTarget.value)} disabled={saving} />
      </FormField>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: space.s }}>
      {cfg.mode === 'single' ? (
        <RadioGroup label="Choose one" value={ids[0]} onValueChange={(v) => setIds([v])} disabled={saving}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: space.s }}>
            {cfg.options.map((o) => <Radio key={o.id} value={o.id}>{o.label}</Radio>)}
          </div>
        </RadioGroup>
      ) : (
        <div role="group" aria-labelledby={labelId} style={{ display: 'flex', flexDirection: 'column', gap: space.s }}>
          <Label as="span" step="l" id={labelId}>Select all that apply</Label>
          {cfg.options.map((o) => (
            <Checkbox key={o.id} checked={ids.includes(o.id)} disabled={saving}
              onChange={(e) => { const on = e.currentTarget.checked; setIds((x) => (on ? [...x, o.id] : x.filter((id) => id !== o.id))); }}>
              {o.label}
            </Checkbox>
          ))}
        </div>
      )}
      {otherField}
      {touched && !ids.length && <Text step="s" tone="negative">Choose at least one option to save.</Text>}
      {wouldAdd && <Text step="s" tone="secondary">Saving this answer adds a follow-up question.</Text>}
      <div>
        <Button size="s" loading={saving} disabled={saving} onClick={onSave}>
          {op?.phase === 'failed' ? 'Try again' : req.selection ? 'Save changes' : 'Save answer'}
        </Button>
      </div>
      <ConfirmationDialog
        open={confirm !== null}
        title="Remove the follow-up answer?"
        confirmLabel="Remove and save"
        destructive
        onCancel={() => setConfirm(null)}
        onConfirm={() => { save((confirm ?? []).map((f) => f.id)); setConfirm(null); }}
      >
        {`This answer no longer calls for follow-up ${confirm?.map(requestNumber).join(', ')}. Saving removes what was entered there.`}
      </ConfirmationDialog>
    </div>
  );
}

function FileResponse({ req, op, store, notify, onFiles, dragOver, label }: ResponseProps & { label?: string }) {
  const num = requestNumber(req);
  // N/A and "sent another way" show what was saved, but take no new file until reopened.
  const editable = canUpload(req);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: space.s, minWidth: 0 }}>
      <UploadedFiles req={req} store={store} notify={notify} num={num} editable={editable && !(op && op.phase !== 'failed')} />
      {editable && <UploadBar req={req} op={op} store={store} notify={notify} onFiles={onFiles} dragOver={dragOver} num={num} label={label} />}
    </div>
  );
}

function TemplateResponse(props: ResponseProps) {
  const { req, notify } = props;
  const t = req.template!;
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const download = async () => {
    setBusy(true);
    const err = await downloadTemplate(t.path, t.fileName, t.mimeType);
    setBusy(false);
    setError(err);
    if (!err) notify('positive', `${t.fileName} downloaded. Fill it in, then upload it here.`);
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: space.m }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: space.xs }}>
        <Text step="s" tone="secondary">Step 1 · Template provided by Scalar</Text>
        <div style={{ display: 'flex', alignItems: 'center', gap: space.s, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <FileRow name={t.fileName} meta={[{ label: t.name }, { label: `CSV · v${t.version}` }, { label: `Issued ${t.issued}` }]} />
          </div>
          <Button variant="secondary" size="s" loading={busy} leadingIcon={<Icon size="s" tone="inherit"><icons.Download /></Icon>} onClick={download}>
            Download template
          </Button>
        </div>
        {error && <Alert tone="warning" title="Template unavailable" onDismiss={() => setError(null)}>{error}</Alert>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: space.xs }}>
        <Text step="s" tone="secondary">Step 2 · Upload the completed template</Text>
        <FileResponse {...props} label="the completed template" />
      </div>
    </div>
  );
}
