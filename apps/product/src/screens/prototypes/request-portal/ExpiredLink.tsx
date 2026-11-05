/**
 * The page an expired link opens. For security it shows none of the requests:
 * the recipient either asks for a fresh link (to the email already on the
 * request, so nothing to type) or logs in, which opens the requests without a
 * new email.
 */
import { useState } from 'react';
import { Alert, Button, EmptyState, Icon, Text, icons, space } from '@scalar/design-system';
import { maskEmail } from './scenario.js';

const SEND_LATENCY = 700;

export function ExpiredLink({ email, sender, company, onLogin, simulateFailure }: {
  email: string;
  sender: string;
  company: string;
  onLogin: () => void;
  simulateFailure: boolean;
}) {
  const [phase, setPhase] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');
  const masked = maskEmail(email);

  const send = () => {
    setPhase('sending');
    window.setTimeout(() => setPhase(simulateFailure ? 'failed' : 'sent'), SEND_LATENCY);
  };

  return (
    <div style={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: space.xl }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: space.l, alignItems: 'center', maxWidth: '60ch' }}>
        <EmptyState
          type="error"
          headingLevel={2}
          icon={<icons.LinkOff />}
          title="This link has expired"
          body={`For your security, links to ${sender}’s information request for ${company} stop working after a while. Get a new link by email, or log in to continue.`}
          actions={
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: space.s, justifyContent: 'center' }}>
              <Button
                loading={phase === 'sending'}
                disabled={phase === 'sending'}
                leadingIcon={<Icon size="s" tone="inherit"><icons.Mail /></Icon>}
                onClick={send}
              >
                {phase === 'sent' ? 'Send another link' : phase === 'failed' ? 'Try again' : 'Email me a new link'}
              </Button>
              <Button variant="secondary" leadingIcon={<Icon size="s" tone="inherit"><icons.Login /></Icon>} onClick={onLogin}>
                Log in instead
              </Button>
            </div>
          }
        />
        <Text step="s" tone="secondary">The new link goes to {masked}, the address this request was sent to.</Text>
        <div aria-live="polite" style={{ width: '100%' }}>
          {phase === 'sent' && (
            <Alert tone="positive" title="New link sent">
              {`Check ${masked}. The link opens your requests; it may take a minute to arrive. Prototype: no email is sent.`}
            </Alert>
          )}
          {phase === 'failed' && (
            <Alert tone="negative" title="The link was not sent">Something went wrong on our side. Try again in a moment.</Alert>
          )}
        </div>
      </div>
    </div>
  );
}
