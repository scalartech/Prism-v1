/**
 * Information Request — the request builder. The same layout as Requests (and
 * the Unified Request Portal): categories on the left, one numbered list on the
 * right. The analyst writes each request, picks how it is answered, chooses who
 * receives it and when it is due, and sends. Sending adds the requests to the
 * company's Requests list as Pending, numbered after what was already sent.
 *
 * Opened from "New Info Request" on Company · Documents, Questions and Requests,
 * from Firm Valuations and from the Workspace drawer's "Request new document".
 * The company's three navigation tiers stay; Cancel and Send sit in Tier 3.
 *
 * Figma: 10 · Company · Documents & Requests → Information Request (2 frames);
 * layout from the Unified Request Portal prototype.
 */
import { useCallback, useRef, useState } from 'react';
import {
  Alert, Button, ButtonIcon, Chip, ComboboxPanel, FormField, Heading, Icon, Input, Overline, Select, SubmenuItem,
  Text, Textarea, color, icons, radius, space, zIndex,
} from '@scalar/design-system';
import type { ScreenProps } from '../../types.js';
import { href, navigate } from '../../router.js';
import { routes } from '../../routes.js';
import { companyById } from '../../data/fixtures.js';
import { CompanyLayout } from '../../shell/CompanyLayout.js';
import { useDismiss } from '../p04-waterfalls/useDismiss.js';
import { INTRODUCTION, REQUEST_META } from '../prototypes/request-portal/fixtures.js';
import { responseTypeLabel } from '../prototypes/request-portal/model.js';
import { DueDateDialog } from '../prototypes/request-portal/PortalModals.js';
import { CompanyActionsButton, DocumentsSubNav } from './shared.js';
import { defaultDrafts, responsibles } from './data.js';
import { BUILDER_TYPES, CATEGORIES, seedDueDate, sendInformationRequest, type DraftRequest } from './requestData.js';
import { SENT_NOTE_KEY } from './Requests.js';

const fmt = (iso: string) => { const [y, m, d] = iso.split('-'); return `${m}/${d}/${y}`; };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** The company's contacts: the respondent on file first, then everyone in the Figma picker (one entry per name). */
const CONTACTS = [...new Set([REQUEST_META.respondent, ...responsibles.map((r) => r.name)])];

let keySeq = 0;
const newKey = () => `d${++keySeq}`;

export function InformationRequest({ state, params }: ScreenProps) {
  const company = companyById(params.companyId);
  const [drafts, setDrafts] = useState<DraftRequest[]>(() => defaultDrafts.map((d) => ({ ...d, key: newKey() })));
  const [category, setCategory] = useState<string>('all');
  const [recipients, setRecipients] = useState<string[]>([]);
  const [pickerOpen, setPickerOpen] = useState(state === 'responsible-picker');
  const [query, setQuery] = useState('');
  const [dueDate, setDueDate] = useState(seedDueDate);
  const [dueOpen, setDueOpen] = useState(false);
  const [intro, setIntro] = useState(INTRODUCTION.join('\n\n').replace('{sender}', 'Scalar'));
  const [tried, setTried] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const focusKey = useRef<string | null>(null);
  const closePicker = useCallback(() => setPickerOpen(false), []);
  useDismiss(panelRef, pickerOpen, closePicker);

  const blank = drafts.filter((d) => !d.title.trim());
  const problems = [
    !recipients.length && 'Choose at least one person to send the request to.',
    !drafts.length && 'Add at least one request.',
    blank.length > 0 && `${blank.length} request${blank.length === 1 ? ' has' : 's have'} no wording. Write it or remove ${blank.length === 1 ? 'it' : 'them'}.`,
  ].filter((p): p is string => !!p);

  const back = () => navigate(routes.company.requests(company.id));
  const send = () => {
    setTried(true);
    if (problems.length) return;
    const n = sendInformationRequest(
      company.id, drafts, recipients, dueDate,
      intro.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean),
    );
    try {
      window.sessionStorage.setItem(SENT_NOTE_KEY, `${n} request${n === 1 ? '' : 's'} sent to ${recipients.join(', ')}, due ${fmt(dueDate)}. They show as Pending until each one is answered.`);
    } catch { /* storage blocked: the list still shows them */ }
    back();
  };

  const update = (key: string, patch: Partial<DraftRequest>) => setDrafts((all) => all.map((d) => (d.key === key ? { ...d, ...patch } : d)));
  const remove = (key: string) => setDrafts((all) => all.filter((d) => d.key !== key));
  const add = (categoryId: string) => {
    const key = newKey();
    focusKey.current = key;
    setDrafts((all) => {
      // Keep the list in category order: a new request goes after the last one of its category.
      const at = all.map((d) => d.categoryId).lastIndexOf(categoryId);
      const order = CATEGORIES.find((c) => c.id === categoryId)!.order;
      const idx = at >= 0 ? at + 1 : all.findIndex((d) => CATEGORIES.find((c) => c.id === d.categoryId)!.order > order);
      const next = [...all];
      next.splice(idx < 0 ? all.length : idx, 0, { key, categoryId, title: '', responseType: 'file' });
      return next;
    });
  };
  const addRecipient = (name: string) => { if (name && !recipients.includes(name)) setRecipients((r) => [...r, name]); };

  const shownCategories = CATEGORIES.filter((c) => category === 'all' ? drafts.some((d) => d.categoryId === c.id) : c.id === category);
  const typed = query.trim();
  const pickerItems = [
    ...CONTACTS.filter((n) => n.toLowerCase().includes(typed.toLowerCase())).map((n) => ({ value: n, label: n })),
    ...(EMAIL.test(typed) && !CONTACTS.includes(typed) ? [{ value: typed, label: `Send to ${typed}` }] : []),
  ];

  /* ---- left column: categories ---- */
  const aside = (
    <aside style={{ alignSelf: 'start', border: `1px solid ${color.stroke.default}`, borderRadius: radius.s, background: color.bg.surface }}>
      <nav aria-label="Categories" style={{ display: 'flex', flexDirection: 'column', gap: space['2xs'], padding: space.s }}>
        <Overline as="h2" style={{ padding: `${space.xs} ${space.s}` }}>Categories</Overline>
        <SubmenuItem current={category === 'all'} onClick={() => setCategory('all')}>
          <span style={{ display: 'flex', justifyContent: 'space-between', gap: space.s, width: '100%' }}>
            <span>All requests</span><Text as="span" step="s" tone="secondary">{drafts.length}</Text>
          </span>
        </SubmenuItem>
        {CATEGORIES.map((c) => {
          const n = drafts.filter((d) => d.categoryId === c.id).length;
          return (
            <SubmenuItem key={c.id} current={category === c.id} onClick={() => setCategory(c.id)}>
              <span style={{ display: 'flex', justifyContent: 'space-between', gap: space.s, width: '100%' }}>
                <span style={{ whiteSpace: 'nowrap' }}>{c.order}. {c.name}</span>
                <Text as="span" step="s" tone="secondary">{n}</Text>
              </span>
            </SubmenuItem>
          );
        })}
      </nav>
    </aside>
  );

  /* ---- who, when, and the introduction ---- */
  const sendTo = (
    <section aria-labelledby="ir-send-to" style={{ display: 'flex', flexDirection: 'column', gap: space.m, padding: space.m, borderBottom: `1px solid ${color.stroke.divider}` }}>
      <Heading level={2} step="m" id="ir-send-to">Send to</Heading>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: space.l, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: space.s }}>
          <div style={{ position: 'relative' }} data-popover-trigger="">
            <FormField
              label="Recipients"
              state={tried && !recipients.length ? 'error' : undefined}
              helperText={tried && !recipients.length
                ? 'Choose at least one recipient.'
                : 'Each person gets an email with a link to these requests. Pick a contact or type an email address.'}
            >
              <Input
                readOnly
                placeholder="Select a responsible or add a new one"
                value=""
                aria-haspopup="listbox"
                aria-expanded={pickerOpen}
                onClick={() => setPickerOpen((o) => !o)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'ArrowDown') { e.preventDefault(); setPickerOpen(true); } }}
                leadingIcon={<Icon size="s" tone="secondary"><icons.PersonAdd /></Icon>}
                trailingIcon={<Icon size="s" tone="secondary">{pickerOpen ? <icons.KeyboardArrowUp /> : <icons.KeyboardArrowDown />}</Icon>}
              />
            </FormField>
            {pickerOpen && (
              <div ref={panelRef} style={{ position: 'absolute', top: '100%', left: 0, zIndex: zIndex.overlay }}>
                {/* The panel's search takes focus when it opens (combobox pattern). */}
                <ComboboxPanel
                  // eslint-disable-next-line jsx-a11y/no-autofocus
                  autoFocus
                  multiple
                  label="Recipients"
                  searchPlaceholder="Find a person or type an email"
                  items={pickerItems}
                  value={recipients}
                  query={query}
                  onQueryChange={setQuery}
                  onSelect={(v) => {
                    setRecipients((r) => (r.includes(v) ? r.filter((x) => x !== v) : [...r, v]));
                    setQuery('');
                  }}
                  footer={
                    <Button variant="tertiary" size="s" disabled={!EMAIL.test(typed)} leadingIcon={<Icon size="s" tone="inherit"><icons.Add /></Icon>}
                      onClick={() => { addRecipient(typed); setQuery(''); }}>
                      Add a new responsible
                    </Button>
                  }
                />
              </div>
            )}
          </div>
          {recipients.length > 0 && (
            <div aria-label="Selected recipients" role="group" style={{ display: 'flex', flexWrap: 'wrap', gap: space.xs }}>
              {recipients.map((name) => (
                <Chip key={name} leadingIcon={<Icon size="xs" tone="inherit"><icons.Person /></Icon>} onRemove={() => setRecipients((r) => r.filter((x) => x !== name))}>
                  {name}
                </Chip>
              ))}
            </div>
          )}
        </div>
        <FormField label="Due date" helperText="Recipients see how many days are left. You can change it after sending.">
          <div>
            <Button variant="secondary" leadingIcon={<Icon size="s" tone="inherit"><icons.EditCalendar /></Icon>} onClick={() => setDueOpen(true)}
              aria-label={`Due ${fmt(dueDate)}. Change due date`}>
              Due {fmt(dueDate)}
            </Button>
          </div>
        </FormField>
      </div>
      <FormField label="Introduction" helperText="Shown above the requests. Leave a blank line between paragraphs.">
        <Textarea rows={4} value={intro.replace('{company}', company.name)} onChange={(e) => setIntro(e.target.value)} />
      </FormField>
    </section>
  );

  /* ---- the numbered list ---- */
  const list = (
    <ul aria-label="Requests to send" style={{ margin: 0, padding: 0 }}>
      {shownCategories.map((c) => {
        const items = drafts.filter((d) => d.categoryId === c.id);
        return [
          <li key={`h-${c.id}`} style={{ listStyle: 'none', padding: `${space.s} ${space.m} ${space.xs}`, background: color.bg.subtle, borderBottom: `1px solid ${color.stroke.divider}` }}>
            <Overline>{`${c.order}. ${c.name}`}</Overline>
          </li>,
          ...items.map((d, i) => {
            const n = `${c.order}.${i + 1}`;
            const missing = tried && !d.title.trim();
            return (
              <li key={d.key} style={{ listStyle: 'none', display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr) minmax(min-content, 22%) auto', alignItems: 'start', gap: space.s, padding: `${space.s} ${space.m}`, borderBottom: `1px solid ${color.stroke.divider}` }}>
                <Text as="span" step="m" weight="semiBold" tone="secondary" style={{ paddingTop: space.xs, fontVariantNumeric: 'tabular-nums' }}>{n}</Text>
                <FormField state={missing ? 'error' : undefined} helperText={missing ? 'Write the request or remove it.' : undefined}>
                  <Input
                    aria-label={`Request ${n}`}
                    // Focus a request the analyst just added.
                    ref={(el) => { if (el && focusKey.current === d.key) { el.focus(); focusKey.current = null; } }}
                    placeholder={d.responseType === 'file' ? 'Name the document you need' : 'Write the question'}
                    value={d.title}
                    onChange={(e) => update(d.key, { title: e.target.value })}
                  />
                </FormField>
                <Select aria-label={`How request ${n} is answered`} value={d.responseType}
                  onChange={(e) => update(d.key, { responseType: e.currentTarget.value as DraftRequest['responseType'] })}>
                  {BUILDER_TYPES.map((t) => <option key={t} value={t}>{responseTypeLabel[t]}</option>)}
                </Select>
                <ButtonIcon variant="tertiary" size="s" label={`Remove request ${n}`} onClick={() => remove(d.key)}
                  icon={<Icon size="s" tone="inherit"><icons.Delete /></Icon>} />
              </li>
            );
          }),
          <li key={`a-${c.id}`} style={{ listStyle: 'none', padding: `${space.xs} ${space.m}`, borderBottom: `1px solid ${color.stroke.divider}` }}>
            <Button variant="tertiary" size="s" leadingIcon={<Icon size="s" tone="inherit"><icons.Add /></Icon>} onClick={() => add(c.id)}>
              {`Add request to ${c.name}`}
            </Button>
          </li>,
        ];
      })}
      {category === 'all' && (
        <li style={{ listStyle: 'none', padding: space.m }}>
          <Text step="s" tone="secondary">Pick a category on the left to add a request to one that has none yet.</Text>
        </li>
      )}
    </ul>
  );

  return (
    <CompanyLayout
      company={company}
      section="documents"
      date={company.asOf}
      headerEnd={<CompanyActionsButton />}
      subNav={<DocumentsSubNav companyId={company.id} current="requests" />}
      subNavEnd={
        <>
          {/* Prototype: what a recipient sees from the request email. */}
          <Button variant="tertiary" size="xs" asChild>
            <a href={href(routes.prototypes.requestPortal(`${company.id}-request`))}>Preview recipient page</a>
          </Button>
          <Button variant="tertiary" size="xs" onClick={back}>Cancel</Button>
          <Button variant="primary" size="xs" trailingIcon={<Icon size="s" tone="inherit"><icons.Send /></Icon>} onClick={send}>
            {`Send ${drafts.length} request${drafts.length === 1 ? '' : 's'}`}
          </Button>
        </>
      }
      dock={false}
      overlay={
        <DueDateDialog open={dueOpen} onClose={() => setDueOpen(false)} dueDate={dueDate} onSave={setDueDate} />
      }
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: space.m }}>
        <Heading level={2} step="2xl">New Information Request</Heading>
        <Text step="m" tone="secondary">{`${company.name} · Report Date ${company.asOf} · ${drafts.length} requests in ${new Set(drafts.map((d) => d.categoryId)).size} categories`}</Text>
      </div>

      {tried && problems.length > 0 && (
        <Alert tone="negative" title="This request can’t be sent yet">
          <ul style={{ margin: 0, paddingLeft: space.l }}>
            {problems.map((p) => <li key={p}><Text step="m">{p}</Text></li>)}
          </ul>
        </Alert>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(min-content, 1fr) minmax(0, 4fr)', gap: space.l, alignItems: 'start' }}>
        {aside}
        <section aria-label="Request" style={{ minWidth: 0, border: `1px solid ${color.stroke.default}`, borderRadius: radius.s, background: color.bg.surface }}>
          {sendTo}
          {list}
        </section>
      </div>
    </CompanyLayout>
  );
}
