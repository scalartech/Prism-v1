/**
 * Express mode: the recipient drops every document they have and pastes what
 * they know; we suggest where each file goes and draft answers. They review
 * every suggestion before anything is saved (G3.7), and applying goes through
 * the store's normal lifecycle, so a failed save stays Pending (P0.3).
 *
 * Steps: add (drop + paste) → analyzing (AiOutline + words) → review → applying.
 */
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import {
  AiOutline, Alert, Button, Checkbox, Chip, Dropzone, FileRow, FormField, Icon, Input, Modal, Overline, Select, Spinner,
  Text, Textarea, color, glyphs, icons, radius, space,
} from '@scalar/design-system';
import {
  FILE_TYPES, analyze, requestLabel, sampleContent, type AnswerSuggestion, type Confidence, type FileSuggestion,
} from './expressMatch.js';
import { formatBytes, type InformationRequest } from './model.js';
import type { RequestSet } from './fixtures.js';

const ANALYZE_LATENCY = 1600;
export const UNSORTED = '__unsorted';

export interface ExpressPlan {
  files: { file: File; requestId: string }[];
  answers: { requestId: string; value: string }[];
  unsorted: File[];
}

type Step = 'add' | 'analyzing' | 'review' | 'applying';

const ConfidenceChip = ({ c }: { c: Confidence | null }) => c === null ? (
  <Chip size="s" styleVariant="default" leadingIcon={<Icon size="xs" tone="inherit"><icons.Help /></Icon>}>No match</Chip>
) : c === 'strong' ? (
  <Chip size="s" styleVariant="positive" leadingIcon={<Icon size="xs" tone="inherit"><icons.CheckCircle /></Icon>}>Strong match</Chip>
) : (
  <Chip size="s" styleVariant="warning" leadingIcon={<Icon size="xs" tone="inherit"><icons.Warning /></Icon>}>Check this</Chip>
);

const section = { display: 'flex', flexDirection: 'column', gap: space.s } as const;
const card = { display: 'flex', flexDirection: 'column', gap: space.s, padding: space.m, border: `1px solid ${color.stroke.default}`, borderRadius: radius.s } as const;

export function ExpressModeDialog({ open, onClose, requests, requestSet, initialFiles, onApply }: {
  open: boolean;
  onClose: () => void;
  requests: readonly InformationRequest[];
  requestSet: RequestSet;
  /** Files dropped on the request list before the dialog opened. */
  initialFiles: readonly File[];
  /** Saves the plan through the store, reporting each saved item. */
  onApply: (plan: ExpressPlan, progress: (done: number) => void) => Promise<void>;
}) {
  const [step, setStep] = useState<Step>('add');
  const [files, setFiles] = useState<File[]>([]);
  const [text, setText] = useState('');
  const [fileRows, setFileRows] = useState<(FileSuggestion & { include: boolean; target: string })[]>([]);
  const [answerRows, setAnswerRows] = useState<(AnswerSuggestion & { include: boolean })[]>([]);
  const [applied, setApplied] = useState(0);

  // Every open starts fresh, with whatever was dropped on the list.
  useEffect(() => {
    if (!open) return;
    setStep('add'); setFiles([...initialFiles]); setText(''); setFileRows([]); setAnswerRows([]); setApplied(0);
  }, [open, initialFiles]);

  const byId = useMemo(() => new Map(requests.map((r) => [r.id, r])), [requests]);
  const open_ = requests.filter((r) => r.status === 'pending' && !r.parentId);
  const fileTargets = open_.filter((r) => FILE_TYPES.has(r.responseType));

  const run = () => {
    setStep('analyzing');
    window.setTimeout(() => {
      const { fileSuggestions, answerSuggestions } = analyze(files, text, requests);
      setFileRows(fileSuggestions.map((s) => ({ ...s, include: true, target: s.requestId ?? UNSORTED })));
      setAnswerRows(answerSuggestions.map((s) => ({ ...s, include: true })));
      setStep('review');
    }, ANALYZE_LATENCY);
  };

  const useSample = () => {
    const s = sampleContent(requestSet);
    setFiles((f) => [...f, ...s.files.filter((x) => !f.some((y) => y.name === x.name))]);
    setText((t) => (t.trim() ? t : s.text));
  };

  const matched = fileRows.filter((r) => r.requestId !== null);
  const unmatched = fileRows.filter((r) => r.requestId === null);
  const fileApplies = fileRows.filter((r) => r.include && r.target !== UNSORTED);
  const toUnsorted = [...new Set(fileRows.filter((r) => r.target === UNSORTED || !r.include).map((r) => r.file))]
    // A file also placed on a request is not unsorted.
    .filter((f) => !fileApplies.some((r) => r.file === f));
  const answerApplies = answerRows.filter((r) => r.include && r.value.trim());
  const applyCount = fileApplies.length + answerApplies.length;

  const apply = async () => {
    setStep('applying');
    await onApply({
      files: fileApplies.map((r) => ({ file: r.file, requestId: r.target })),
      answers: answerApplies.map((r) => ({ requestId: r.requestId, value: r.value })),
      unsorted: toUnsorted,
    }, setApplied);
  };

  const patchFile = (key: string, p: Partial<(typeof fileRows)[number]>) => setFileRows((rows) => rows.map((r) => (r.key === key ? { ...r, ...p } : r)));
  const patchAnswer = (key: string, p: Partial<(typeof answerRows)[number]>) => setAnswerRows((rows) => rows.map((r) => (r.key === key ? { ...r, ...p } : r)));

  const targetSelect = (row: (typeof fileRows)[number]) => (
    <FormField label={row.requestId === null ? 'Assign to' : 'Goes to'}>
      <Select value={row.target} onChange={(e) => patchFile(row.key, { target: e.currentTarget.value, include: true })}>
        <option value={UNSORTED}>Leave unsorted</option>
        {fileTargets.map((r) => <option key={r.id} value={r.id}>{requestLabel(r)}</option>)}
      </Select>
    </FormField>
  );

  const answerControl = (row: (typeof answerRows)[number]) => {
    const req = byId.get(row.requestId)!;
    const set = (value: string) => patchAnswer(row.key, { value, include: true });
    switch (req.responseType) {
      case 'choice':
        return <FormField label="Answer"><Select value={row.value} onChange={(e) => set(e.currentTarget.value)}><option value="yes">Yes</option><option value="no">No</option></Select></FormField>;
      case 'date':
        return <FormField label="Date"><Input type="date" value={row.value} onChange={(e) => set(e.currentTarget.value)} /></FormField>;
      case 'multiple_choice':
        return (
          <FormField label="Answer">
            <Select value={row.value} onChange={(e) => set(e.currentTarget.value)}>
              {req.choice!.options.filter((o) => !o.other).map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </Select>
          </FormField>
        );
      default:
        return <FormField label="Answer"><Textarea rows={2} value={row.value} onChange={(e) => set(e.currentTarget.value)} /></FormField>;
    }
  };

  const fileCard = (row: (typeof fileRows)[number]) => (
    <div key={row.key} style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: space.s, flexWrap: 'wrap' }}>
        <Checkbox size="s" checked={row.include} onChange={(e) => patchFile(row.key, { include: e.currentTarget.checked })} aria-label={`Use ${row.file.name}`} />
        <div style={{ flex: 1, minWidth: 0 }}><FileRow name={row.file.name} meta={[{ label: formatBytes(row.file.size) }]} /></div>
        <ConfidenceChip c={row.target === row.requestId ? row.confidence : row.target === UNSORTED ? null : 'strong'} />
      </div>
      {targetSelect(row)}
    </div>
  );

  const body = (() => {
    if (step === 'add') return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: space.l }}>
        <Text step="m">Drop all of the documents, or paste in any information you can provide here. We will automatically sort them and answer the questions based on what you provide.</Text>
        <Text step="s" tone="secondary">You review every suggestion before anything is saved.</Text>
        <div style={section}>
          <Dropzone
            multiple
            onFiles={(fs) => setFiles((f) => [...f, ...fs.filter((x) => !f.some((y) => y.name === x.name && y.size === x.size))])}
            hint="Any number of files · PDF, XLSX, XLS, CSV, DOCX, DOC or PPTX · 250 MB max each"
            prompt={(browse) => <>Drop all of your documents here or {browse('choose files')}</>}
          />
          {files.length > 0 && (
            <div style={section}>
              <Text step="s" tone="secondary">{files.length} file{files.length === 1 ? '' : 's'} added</Text>
              {files.map((f) => (
                <div key={`${f.name}-${f.size}`} style={{ display: 'flex', alignItems: 'center', gap: space.xs }}>
                  <div style={{ flex: 1, minWidth: 0 }}><FileRow name={f.name} meta={[{ label: formatBytes(f.size) }]} /></div>
                  <Button variant="tertiary" size="s" tone="negative" onClick={() => setFiles((x) => x.filter((y) => y !== f))}>Remove</Button>
                </div>
              ))}
            </div>
          )}
        </div>
        <FormField label="Or paste information" helperText="Emails, notes or answers in your own words. We match each sentence to the question it answers.">
          <Textarea rows={5} value={text} onChange={(e) => setText(e.currentTarget.value)} placeholder="e.g. There have been no secondary transactions. We received a term sheet in September 2026." />
        </FormField>
        <div><Button variant="tertiary" size="s" leadingIcon={<Icon size="s" tone="inherit"><icons.Science /></Icon>} onClick={useSample}>Try with sample files and text</Button></div>
      </div>
    );

    if (step === 'analyzing' || step === 'applying') {
      const label = step === 'analyzing'
        ? `Reading ${files.length} file${files.length === 1 ? '' : 's'}${text.trim() ? ' and your notes' : ''}…`
        : `Saved ${applied} of ${applyCount}…`;
      return (
        <AiOutline active>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: space.m, padding: space['2xl'] }} aria-live="polite">
            <Spinner label={label} />
            <Text step="s" tone="secondary">{step === 'analyzing' ? 'Matching documents to requests and drafting answers.' : 'Each request turns Complete once its response is saved.'}</Text>
          </div>
        </AiOutline>
      );
    }

    // review
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: space.l }}>
        <Alert tone="info" title="Check before you apply">
          {`We matched ${matched.length} document${matched.length === 1 ? '' : 's'} and drafted ${answerRows.length} answer${answerRows.length === 1 ? '' : 's'}. Change anything that looks wrong; nothing is saved until you apply.`}
        </Alert>
        {matched.length > 0 && (
          <div style={section}>
            <Overline as="h3">Documents</Overline>
            {matched.map(fileCard)}
          </div>
        )}
        {answerRows.length > 0 && (
          <div style={section}>
            <Overline as="h3">Answers from your notes</Overline>
            {answerRows.map((row) => {
              const req = byId.get(row.requestId)!;
              return (
                <div key={row.key} style={card}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: space.s }}>
                    <Checkbox size="s" checked={row.include} onChange={(e) => patchAnswer(row.key, { include: e.currentTarget.checked })} aria-label={`Use the answer to ${requestLabel(req)}`} />
                    <Text step="m" weight="semiBold" style={{ flex: 1, minWidth: 0 }}>{requestLabel(req)}</Text>
                    <ConfidenceChip c={row.confidence} />
                  </div>
                  {answerControl(row)}
                  <Text step="s" tone="secondary">From your notes: “{row.quote}”</Text>
                </div>
              );
            })}
          </div>
        )}
        {unmatched.length > 0 && (
          <div style={section}>
            <Overline as="h3">Not matched</Overline>
            <Text step="s" tone="secondary">We couldn’t tell which request these answer. Pick one, or leave them unsorted: they stay at the top of your list for later.</Text>
            {unmatched.map(fileCard)}
          </div>
        )}
        {!fileRows.length && !answerRows.length && (
          <Alert tone="warning" title="Nothing to suggest">We couldn’t match anything to an open request. Go back and add more files or notes, or answer the requests one by one.</Alert>
        )}
      </div>
    );
  })();

  const busy = step === 'analyzing' || step === 'applying';
  const footer = step === 'add' ? (
    <>
      <Text step="s" tone="tertiary" style={{ marginRight: 'auto' }}>Prototype: matching is simulated in your browser.</Text>
      <Button variant="secondary" onClick={onClose}>Cancel</Button>
      <Button style={AI_BUTTON_STYLE} leadingIcon={<Icon size="s" tone="inherit"><glyphs.AiMark /></Icon>} disabled={!files.length && !text.trim()} onClick={run}>Analyze</Button>
    </>
  ) : step === 'review' ? (
    <>
      <Button variant="secondary" onClick={() => setStep('add')}>Back</Button>
      <Button disabled={!applyCount && !toUnsorted.length} onClick={() => void apply()}>
        {applyCount ? `Apply ${applyCount} item${applyCount === 1 ? '' : 's'}` : 'Keep files unsorted'}
      </Button>
    </>
  ) : (
    <Button variant="secondary" disabled>Working…</Button>
  );

  return (
    <Modal open={open} onClose={busy ? () => {} : onClose} dismissOnScrimClick={false} size="l" title="Express mode" footer={footer}>
      {body}
    </Modal>
  );
}

/**
 * The Express mode button wears the AI colour, like the Ask AI tool. Button has no AI tone, so
 * this sets its documented tone properties (`--btn-*`) to the AI tokens. White on `bg.ai` is 5:1 (AA).
 */
export const AI_BUTTON_STYLE = {
  '--btn-fill': color.bg.ai, '--btn-fill-hover': color.bg.ai, '--btn-fill-pressed': color.bg.ai, '--btn-on': color.text.onAi,
  '--btn-ink': color.text.ai, '--btn-ink-hover': color.text.ai, '--btn-ink-pressed': color.text.ai,
  '--btn-line': color.stroke.ai, '--btn-tint': color.bg.aiSubtle,
} as CSSProperties;

/** Shown on a request whose response came from Express mode. */
export const EXPRESS_NOTE = 'Matched by Express mode';
