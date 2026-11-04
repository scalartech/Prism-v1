/**
 * Documents (firm) › Requests and › Questions — the firm Documents page with
 * its Tier 3 tabs (Documents · Questions · Requests). As on Documents, the left
 * column is All Companies: pick one to see its information request (or its
 * questions) exactly as Company › Documents shows them. With no company picked,
 * the body lists the companies that still owe something; picking one there
 * shows its figures as a card beside the list, so the team sees who to chase.
 * On Questions the card is followed by that company's pending questions,
 * answerable in place.
 *
 * The company's list, tools and dialogs come from the same hooks as the
 * company pages (`useRequestsWorkspace`, `useQuestionsWorkspace`), so a
 * request reads the same everywhere — including Firm Valuations' Process
 * Management column.
 *
 * Prototype (proto:firm-requests / proto:firm-questions): no Figma frames yet.
 */
import { useState, type ReactNode } from 'react';
import {
  Button, Card, CardItem, Chip, EmptyState, Heading, Icon, TertiaryMenu, Text, icons, space,
} from '@scalar/design-system';
import type { ScreenProps } from '../../types.js';
import { navigate } from '../../router.js';
import { routes } from '../../routes.js';
import { AppFrame, scrollBody } from '../../shell/AppFrame.js';
import { PageHeader } from '../../shell/PageHeader.js';
import { ToolbarKebab } from '../../shell/Toolbar.js';
import { ABSENCE_LABEL } from '../../domain/display.js';
import { useQuestionsWorkspace, type QuestionsWorkspace } from '../p10-company-documents/Questions.js';
import { useRequestsWorkspace } from '../p10-company-documents/Requests.js';
import { InfoRequestButton } from '../p10-company-documents/shared.js';
import { recipientsFor, requestCounts, type RequestCounts } from '../p10-company-documents/requestData.js';
import { docCompanies, type DocCompany } from './data.js';
import { CompanyColumn, CompanyRow, ScrollList, columnPanel, FirmDocsTabs, type FirmDocsTab } from './parts.js';

const fmt = (iso?: string) => { if (!iso) return ABSENCE_LABEL['not-entered']; const [y, m, d] = iso.split('-'); return `${m}/${d}/${y}`; };

/** What a company row in the left column says for this tab. */
function pendingWords(n: number, of: number, noun: string) {
  if (of === 0) return <Text as="span" step="s" tone="tertiary">None sent</Text>;
  return n
    ? <Text as="span" step="s" tone="secondary" style={{ whiteSpace: 'nowrap' }}>{n} pending</Text>
    : <Text as="span" step="s" tone="positive" style={{ whiteSpace: 'nowrap' }}>{`All ${noun}`}</Text>;
}

/** Firm chrome shared by both tabs: AppFrame · page header · Tier 3 · companies column + body. */
function FirmTabFrame({ tab, companyId, end, overlay, columnEnd, children }: {
  tab: FirmDocsTab;
  companyId?: string;
  end?: ReactNode;
  overlay?: ReactNode;
  columnEnd: (c: DocCompany) => ReactNode;
  children: ReactNode;
}) {
  const to = tab === 'requests' ? routes.firmDocuments.companyRequests : routes.firmDocuments.companyQuestions;
  return (
    <AppFrame area="documents" date="03/31/2025" overlay={overlay}>
      <PageHeader title="Documents" trailing={<ToolbarKebab />} />
      <TertiaryMenu end={end}>
        <FirmDocsTabs current={tab} companyId={companyId} />
      </TertiaryMenu>
      {/* Every column stretches to the body's height and scrolls inside. */}
      <main style={{ ...scrollBody, display: 'flex', gap: space.l, padding: space.l, alignItems: 'stretch' }}>
        <CompanyColumn selectedId={companyId} onSelect={(id) => navigate(to(id))} end={columnEnd} />
        {/* A picked company's list is one column; the overview boxes its own two columns. */}
        <section style={{ ...(companyId ? columnPanel : {}), flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', gap: space.l }}>
          {children}
        </section>
      </main>
    </AppFrame>
  );
}

/**
 * Every company that still owes something, as one column. Picking one opens
 * its details beside the list as a `Card` (Core/Card › With Tag And Action):
 * the company is the title, what is pending is the tag, the figures are
 * `CardItem` rows and the action opens the company's full list. So the page
 * reads All Companies · pending companies · details.
 */
function Overview({ tab, openId, setOpenId, live, below }: {
  tab: FirmDocsTab;
  openId: string | undefined;
  setOpenId: (fn: (id: string | undefined) => string | undefined) => void;
  /** The picked company's question tallies straight from its store (stored counts lag one save). */
  live?: QuestionsWorkspace['live'];
  /** Shown under the card in the third column. */
  below?: ReactNode;
}) {
  const questionsTab = tab === 'questions';
  const rows = docCompanies()
    .map((c) => {
      const n = requestCounts(c.id);
      const fresh = live && c.id === openId ? { ...n, questions: live.sent, questionsAnswered: live.answered } : n;
      return { c, n: fresh };
    })
    .map((r) => ({ ...r, open: questionsTab ? r.n.questions - r.n.questionsAnswered : r.n.pending }))
    // The picked company stays listed once its last question is answered, so the card doesn't vanish mid-task.
    .filter((r) => r.open > 0 || r.c.id === openId)
    .sort((a, b) => b.open - a.open || a.c.name.localeCompare(b.c.name));
  const picked = rows.find((r) => r.c.id === openId);
  const to = questionsTab ? routes.firmDocuments.companyQuestions : routes.firmDocuments.companyRequests;
  const noun = questionsTab ? 'questions' : 'requests';

  const list = (
    <section aria-labelledby="pending-companies" style={{ ...columnPanel, overflow: 'hidden', flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column', gap: space.s }}>
      <div>
        <Heading level={2} step="m" id="pending-companies">{questionsTab ? 'Pending questions' : 'Pending requests'}</Heading>
        <Text step="s" tone="secondary">
          {rows.length
            ? `${rows.length} ${rows.length === 1 ? 'company has' : 'companies have'} ${noun} waiting, most pending first. Pick one to see its details.`
            : `No company has ${noun} waiting.`}
        </Text>
      </div>
      {rows.length === 0 ? (
        <EmptyState
          type="no-results"
          title="Nothing pending"
          body={questionsTab ? 'Every question sent has been answered.' : 'Every company has answered everything it was sent.'}
          icon={<Icon size="xl" tone="secondary"><icons.Inbox /></Icon>}
        />
      ) : (
        <ScrollList noun={['company', 'companies']}>
          {rows.map(({ c, open }) => (
            <CompanyRow
              key={c.id}
              name={c.name}
              selected={c.id === openId}
              onClick={() => setOpenId((id) => (id === c.id ? undefined : c.id))}
              end={<Text as="span" step="s" tone="secondary" style={{ whiteSpace: 'nowrap' }}>{open} pending</Text>}
            />
          ))}
        </ScrollList>
      )}
    </section>
  );

  const details = picked && (() => {
    const { c, n, open } = picked;
    const answered = n.questionsAnswered;
    return (
      <section aria-label={`${c.name} details`} style={{ ...columnPanel, flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column', gap: space.l }}>
        <Card
          title={c.name}
          headingLevel={2}
          tag={open ? <Chip styleVariant="warning">{`${open} pending`}</Chip> : <Chip styleVariant="positive">All answered</Chip>}
          action={
            <Button variant="tertiary" size="s" trailingIcon={<Icon size="s" tone="inherit"><icons.ArrowForward /></Icon>} onClick={() => navigate(to(c.id))}>
              {questionsTab ? 'Open questions' : 'Open requests'}
            </Button>
          }
        >
          <CardItem label="Fund" value={c.fund ?? ABSENCE_LABEL['not-entered']} />
          {questionsTab ? (
            <>
              <CardItem label="Sent" value={n.questions} />
              <CardItem label="Answered" value={answered} />
              <CardItem label="Pending" value={n.questions - answered} />
            </>
          ) : (
            <>
              <CardItem label="Sent" value={n.total} />
              <CardItem label="Resolved" value={n.resolved} />
              <CardItem label="Documents pending" value={n.documentsPending} />
              <CardItem label="Questions pending" value={n.questions - answered} />
            </>
          )}
          <CardItem label="Due" value={fmt(n.dueDate)} />
          {!questionsTab && <CardItem label="Sent to" value={recipientsFor(c.id).join(', ') || ABSENCE_LABEL['not-entered']} />}
        </Card>
        {below}
      </section>
    );
  })();

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: space.l, alignItems: 'stretch' }}>
      {list}
      {details || (
        <section aria-label="Company details" style={{ ...columnPanel, flex: '1 1 0', minWidth: 0 }}>
          <EmptyState
            title="Pick a company"
            body={`Choose a company from the list to see its ${noun} here.`}
            icon={<Icon size="xl" tone="secondary"><icons.Domain /></Icon>}
          />
        </section>
      )}
    </div>
  );
}

const countsOf = (c: DocCompany): RequestCounts => requestCounts(c.id);

export function FirmRequests({ params }: ScreenProps) {
  const companyId = params.companyId;
  const picked = companyId ? docCompanies().find((c) => c.id === companyId) : undefined;
  // Always mounted (hooks), but only shown once a company is picked.
  const [openId, setOpenId] = useState<string | undefined>();
  const w = useRequestsWorkspace(companyId, 'default', picked ? `${picked.name} requests` : 'Requests');
  return (
    <FirmTabFrame
      tab="requests"
      companyId={picked?.id}
      end={picked && <>{w.tools}<InfoRequestButton companyId={picked.id} /></>}
      overlay={picked && w.overlay}
      columnEnd={(c) => { const n = countsOf(c); return pendingWords(n.pending, n.total, 'resolved'); }}
    >
      {picked ? <>{w.heading}{w.content}</> : <Overview tab="requests" openId={openId} setOpenId={setOpenId} />}
    </FirmTabFrame>
  );
}

export function FirmQuestions({ params }: ScreenProps) {
  const companyId = params.companyId;
  const picked = companyId ? docCompanies().find((c) => c.id === companyId) : undefined;
  const [openId, setOpenId] = useState<string | undefined>();
  // One workspace: the company picked on the left, else the one opened in the overview (its pending list sits under the card).
  const w = useQuestionsWorkspace(companyId ?? openId, 'default', picked ? `${picked.name} questions` : 'Questions');
  return (
    <FirmTabFrame
      tab="questions"
      companyId={picked?.id}
      end={picked && <InfoRequestButton companyId={picked.id} />}
      overlay={(picked || openId) && w.overlay}
      columnEnd={(c) => { const n = countsOf(c); return pendingWords(n.questions - n.questionsAnswered, n.questions, 'answered'); }}
    >
      {picked
        ? <>{w.heading}{w.content}</>
        : <Overview tab="questions" openId={openId} setOpenId={setOpenId} live={openId ? w.live : undefined} below={openId && w.pendingList} />}
    </FirmTabFrame>
  );
}
