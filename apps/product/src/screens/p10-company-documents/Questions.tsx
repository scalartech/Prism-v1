/**
 * Company · Questions — the questions sent in information requests (written
 * answers, Yes / No, dates, multiple choice), split into those still waiting
 * for an answer and those answered. Each row opens to show the answer. Same
 * rows and data as Requests; documents stay on Requests.
 *
 * Figma: 10 · Company · Documents & Requests → Questions (1 frame: the empty
 * state). The listed state is a prototype (proto:company-questions:1).
 */
import { useMemo, useState, type ReactNode } from 'react';
import {
  Button, EmptyState, Icon, Overline, Text, Toast, ToastViewport, color, icons, radius, space,
} from '@scalar/design-system';
import type { ScreenProps } from '../../types.js';
import { navigate } from '../../router.js';
import { routes } from '../../routes.js';
import { companyById } from '../../data/fixtures.js';
import { CompanyLayout } from '../../shell/CompanyLayout.js';
import { byNumber, isResolved, type ResponseType } from '../prototypes/request-portal/model.js';
import { DelegateDialog } from '../prototypes/request-portal/PortalModals.js';
import { RequestRow } from '../prototypes/request-portal/RequestRow.js';
import { usePortalStore } from '../prototypes/request-portal/store.js';
import { CompanyActionsButton, DocumentsSubNav, InfoRequestButton, RequestsHeading } from './shared.js';
import { requestsKey, requestsSeed } from './requestData.js';

const QUESTION_TYPES: ResponseType[] = ['text', 'choice', 'multiple_choice', 'date'];

interface ToastItem { id: number; tone: 'positive' | 'negative' | 'info'; text: string; action?: { label: string; onClick: () => void } }

export function Questions({ state, params }: ScreenProps) {
  const company = companyById(params.companyId);
  const seed = useMemo(() => requestsSeed(state), [state]);
  const store = usePortalStore(requestsKey(company.id, state), seed);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [delegateIds, setDelegateIds] = useState<string[]>([]);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dropToast = (id: number) => setToasts((t) => t.filter((x) => x.id !== id));
  const notify = (tone: ToastItem['tone'], text: string, action?: ToastItem['action']) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, tone, text, action }]);
    window.setTimeout(() => dropToast(id), action ? 10_000 : 4500);
  };
  const toggle = (id: string) => setExpanded((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  /* ---- one list, split by whether it is answered ---- */
  const every = store.requests;
  const questions = useMemo(
    () => every.filter((r) => !r.parentId && QUESTION_TYPES.includes(r.responseType)).sort(byNumber),
    [every],
  );
  const answered = questions.filter((r) => isResolved(r, every));
  const pending = questions.filter((r) => !isResolved(r, every));

  const group = (id: string, title: string, items: typeof questions, empty: string) => (
    <section aria-labelledby={id} style={{ border: `1px solid ${color.stroke.default}`, borderRadius: radius.s, background: color.bg.surface }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: space.s, padding: `${space.s} ${space.m}`, background: color.bg.subtle, borderBottom: `1px solid ${color.stroke.divider}` }}>
        <Overline as="h2" id={id}>{title}</Overline>
        <Text as="span" step="s" tone="secondary">{items.length}</Text>
      </div>
      {items.length ? (
        <ul aria-labelledby={id} style={{ margin: 0, padding: 0 }}>
          {items.map((r) => (
            <RequestRow
              key={r.id}
              req={r}
              all={every}
              expanded={expanded.has(r.id)}
              onToggle={() => toggle(r.id)}
              store={store}
              onDelegate={(rid) => setDelegateIds([rid])}
              notify={notify}
              mobile={false}
            />
          ))}
        </ul>
      ) : (
        <Text as="p" step="m" tone="secondary" style={{ margin: 0, padding: space.m }}>{empty}</Text>
      )}
    </section>
  );

  return (
    <CompanyLayout
      company={company}
      section="documents"
      date={company.asOf}
      headerEnd={<CompanyActionsButton />}
      subNav={<DocumentsSubNav companyId={company.id} current="questions" />}
      subNavEnd={<InfoRequestButton companyId={company.id} />}
      dock={false}
      overlay={
        <>
          <ToastViewport aria-label="Notifications">
            {toasts.map((t) => (
              <Toast key={t.id} tone={t.tone} onDismiss={() => dropToast(t.id)}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: space.s, flexWrap: 'wrap' }}>
                  {t.text}
                  {t.action && <Button variant="tertiary" size="xs" onClick={() => { t.action!.onClick(); dropToast(t.id); }}>{t.action.label}</Button>}
                </span>
              </Toast>
            ))}
          </ToastViewport>
          <DelegateDialog
            open={delegateIds.length > 0}
            onClose={() => setDelegateIds([])}
            count={delegateIds.length}
            onSubmit={async (email) => { await store.delegate(delegateIds, email); notify('positive', `Delegated to ${email}.`); }}
          />
        </>
      }
    >
      <RequestsHeading
        companyId={company.id}
        title="Questions"
        counts={{
          done: answered.length, total: questions.length, label: 'Questions answered',
          text: `Questions: ${questions.length} sent, ${answered.length} answered, ${pending.length} pending`,
        }}
      />
      {questions.length === 0 ? (
        <EmptyState
          type="no-data"
          title="No questions sent yet"
          body={`Questions you send to ${company.name} in an information request appear here, with their answers as they come in.`}
          icon={<Icon size="xl" tone="secondary"><icons.QuestionMark /></Icon>}
          actions={
            <Button variant="primary" onClick={() => navigate(routes.company.informationRequest(company.id))}>
              Info Request
            </Button>
          }
        />
      ) : (
        <Stack>
          {group('q-pending', 'Pending answer', pending, 'Every question has been answered.')}
          {group('q-answered', 'Answered', answered, 'No answers yet. They show here as soon as a recipient saves one.')}
        </Stack>
      )}
    </CompanyLayout>
  );
}

function Stack({ children }: { children: ReactNode }) {
  return <div style={{ display: 'flex', flexDirection: 'column', gap: space.l }}>{children}</div>;
}
