/**
 * The portal's dialogs: every nav link and the deadline chip lead somewhere
 * real (P1.5, P1.6, P1.7). Submissions go through the prototype store, so they
 * confirm, fail and retry like the real flow would.
 */
import { useEffect, useState } from 'react';
import {
  Alert, Button, DatePicker, FormField, Input, Link, Modal, Text, Textarea, space,
} from '@scalar/design-system';
import { REQUEST_META } from './fixtures.js';

export type PortalDialog = 'login' | 'contact' | 'privacy' | 'help' | 'due-date' | 'delegate' | null;

const col = { display: 'flex', flexDirection: 'column', gap: space.m } as const;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const fmt = (iso: string) => { const [y, m, d] = iso.split('-'); return `${m}/${d}/${y}`; };
const toIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fromIso = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y!, m! - 1, d!); };

/** Shown only when a firm sent the request: Scalar runs the portal but is not the sender. */
function PoweredBy() {
  return <Text step="s" tone="tertiary">Powered by Scalar</Text>;
}

/**
 * Prototype sign-in. Signing in opens the requests even from an expired link,
 * without a new email. Nothing is checked or sent.
 */
export function LoginDialog({ open, onClose, email: knownEmail, onLogin }: {
  open: boolean; onClose: () => void; email: string; onLogin: (email: string) => void;
}) {
  const [email, setEmail] = useState(knownEmail);
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState(false);
  const badEmail = touched && !EMAIL.test(email);
  const badPassword = touched && !password;
  const submit = () => {
    setTouched(true);
    if (!EMAIL.test(email) || !password) return;
    setPassword(''); setTouched(false);
    onLogin(email);
  };
  return (
    <Modal open={open} onClose={onClose} title="Log in" size="s"
      footer={<>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={submit}>Log in</Button>
      </>}
    >
      <form style={col} onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <Text step="m" tone="secondary">Logged in, you can open your requests without a new link.</Text>
        <FormField label="Work email" required state={badEmail ? 'error' : 'default'} helperText={badEmail ? 'Enter an email like name@company.com.' : undefined}>
          <Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.currentTarget.value)} />
        </FormField>
        <FormField label="Password" required state={badPassword ? 'error' : 'default'} helperText={badPassword ? 'Enter your password.' : 'Prototype: any password works.'}>
          <Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.currentTarget.value)} />
        </FormField>
        <button type="submit" hidden aria-hidden tabIndex={-1} />
      </form>
    </Modal>
  );
}

export function ContactDialog({ open, onClose, notify }: { open: boolean; onClose: () => void; notify: (t: 'positive', s: string) => void }) {
  const [msg, setMsg] = useState('');
  const [touched, setTouched] = useState(false);
  return (
    <Modal open={open} onClose={onClose} title="Contact your analyst" size="m"
      footer={<>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={() => { setTouched(true); if (msg.trim()) { setMsg(''); setTouched(false); onClose(); notify('positive', `Message sent to ${REQUEST_META.analyst}.`); } }}>Send message</Button>
      </>}
    >
      <div style={col}>
        <Text step="m">{REQUEST_META.analyst} · {REQUEST_META.firm}</Text>
        <Text step="m" tone="secondary">Usually replies within one business day. For urgent questions, email <Link href="mailto:analyst@scalar.example">analyst@scalar.example</Link>.</Text>
        <FormField label="Message" required state={touched && !msg.trim() ? 'error' : 'default'} helperText={touched && !msg.trim() ? 'Write your question before sending.' : 'Mention the request number, e.g. 3.2.'}>
          <Textarea rows={4} value={msg} onChange={(e) => setMsg(e.currentTarget.value)} />
        </FormField>
      </div>
    </Modal>
  );
}

export function PrivacyDialog({ open, onClose, sender, poweredBy }: { open: boolean; onClose: () => void; sender: string; poweredBy: boolean }) {
  return (
    <Modal open={open} onClose={onClose} title="Privacy Policy" size="m" footer={<Button onClick={onClose}>Close</Button>}>
      <div style={col}>
        <Alert tone="warning" title="Prototype">This page is a placeholder for the approved policy. In this prototype, answers and files stay in your browser and are not sent anywhere.</Alert>
        <Text step="m">{sender} uses the information you provide only for the valuation work this request supports. Access is limited to the people working on this engagement.</Text>
        <Text step="m">You can ask for a copy or deletion of what you submitted by contacting the sender.</Text>
        {poweredBy && <PoweredBy />}
      </div>
    </Modal>
  );
}

export function HelpDialog({ open, onClose, poweredBy, multiCompany }: { open: boolean; onClose: () => void; poweredBy: boolean; multiCompany: boolean }) {
  const steps = [
    ...(multiCompany ? ['Pick a company in the top bar. Each company has its own requests and progress.'] : []),
    'Pick a category on the left, or work through the whole list.',
    'Open a request to answer it. Each one asks for one kind of response — an answer, a date, a choice, or a file.',
    'Some answers add a follow-up question. It appears inside the same request once you save.',
    'For a template request, download the template, fill it in, and upload it to the same request.',
    'A request turns Complete only once your response is saved. If an upload fails, it stays Pending and you can try again.',
    'If something does not apply, or you sent it another way, say so from the request’s actions. You can reopen it later.',
    'Select several requests to mark or delegate them together. Only the requests you can see are changed.',
  ];
  return (
    <Modal open={open} onClose={onClose} title="How do I use this?" size="m" footer={<Button onClick={onClose}>Got it</Button>}>
      <div style={col}>
        <ol style={{ ...col, margin: 0, paddingLeft: space.l }}>
          {steps.map((s) => <li key={s}><Text step="m">{s}</Text></li>)}
        </ol>
        {poweredBy && <PoweredBy />}
      </div>
    </Modal>
  );
}

/** The sender sets the due date directly: pick a date, it saves. No reason, no approval. */
export function DueDateDialog({ open, onClose, dueDate, onSave }: {
  open: boolean; onClose: () => void; dueDate: string; onSave: (iso: string) => void;
}) {
  const [date, setDate] = useState(dueDate);
  useEffect(() => { if (open) setDate(dueDate); }, [open, dueDate]);
  return (
    <Modal open={open} onClose={onClose} title="Change due date" size="s"
      footer={<>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button disabled={date === dueDate} onClick={() => { onSave(date); onClose(); }}>Save due date</Button>
      </>}
    >
      <div style={col}>
        <Text step="m" tone="secondary">Currently {fmt(dueDate)}. The recipient sees the new date straight away.</Text>
        <DatePicker value={fromIso(date)} onChange={(d) => setDate(toIso(d))} aria-label="New due date" />
      </div>
    </Modal>
  );
}

export function DelegateDialog({ open, onClose, count, onSubmit }: {
  open: boolean; onClose: () => void; count: number; onSubmit: (email: string) => Promise<void>;
}) {
  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bad = !EMAIL.test(email);
  const submit = async () => {
    setTouched(true);
    if (bad) return;
    setBusy(true); setError(null);
    try { await onSubmit(email.trim()); setEmail(''); setTouched(false); onClose(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <Modal open={open} onClose={onClose} title={`Delegate ${count === 1 ? 'this request' : `${count} requests`}`} size="s"
      footer={<>
        <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
        <Button onClick={submit} loading={busy}>Delegate</Button>
      </>}
    >
      <div style={col}>
        <Text step="m" tone="secondary">They will get a link to answer {count === 1 ? 'this request' : 'these requests'} only. You keep access and can still answer them yourself.</Text>
        <FormField label="Colleague’s email" required state={touched && bad ? 'error' : 'default'} helperText={touched && bad ? 'Enter an email like name@company.com.' : undefined}>
          <Input type="email" value={email} onChange={(e) => setEmail(e.currentTarget.value)} onBlur={() => setTouched(true)} />
        </FormField>
        {error && <Alert tone="negative" title="Not delegated">{error}</Alert>}
      </div>
    </Modal>
  );
}
