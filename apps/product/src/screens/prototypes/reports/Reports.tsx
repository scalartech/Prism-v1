/**
 * Reports — list + preview (Round 2 §3). Pick a company on the left and its
 * final report shows on the page, in the same viewer as the company's Final
 * Report tab. The header's measurement date decides which report shows: under
 * "Most Recent" that is each company's own latest date (Nov 4 §6.1), named in
 * the viewer header so it never disagrees with the selector.
 *
 * Left: search, Fund, Final report status, the count line; each row's report
 * status — Published · Out of date (analysts only) · Not created · No
 * valuation. Analysts see the ones that need work first; clients, Published
 * first. Right: the final version, read-only — version history, Set as final
 * and Delete stay on the company's tab ("Open in company"). Zoom, Download and
 * Print sit in row 2, like Tier 3 on the company tab.
 *
 * Create Report (analysts) opens the selected company's Final Report with the
 * create flow. Request Report is unchanged (open question 4).
 */
import { useMemo, useState } from 'react';
import {
  Button, Chip, ComboboxPanel, EmptyState, Icon, Link, Modal, Text, Toast, ToastViewport, icons, space,
} from '@scalar/design-system';
import type { ScreenProps } from '../../../types.js';
import { href, navigate } from '../../../router.js';
import { routes } from '../../../routes.js';
import { companyById } from '../../../data/fixtures.js';
import { AppFrame, scrollBody } from '../../../shell/AppFrame.js';
import { PageHeader } from '../../../shell/PageHeader.js';
import { PrototypePanel } from '../../../shell/PrototypePanel.js';
import { ToolbarKebab } from '../../../shell/Toolbar.js';
import { useViewAs } from '../../../shell/viewAs.js';
import { docCompanies } from '../../p05-documents/data.js';
import { CompanyListPanel, FilterSelect, columnPanel } from '../../p05-documents/parts.js';
import {
  finalVersion, peekFinalReport, reportStatus, reportStatusLabel, type ReportStatus,
} from '../../p10-company-documents/finalReportData.js';
import { ReportTools, ReportViewer, downloadNote } from '../../p10-company-documents/ReportViewer.js';

/** Analysts: rows that need work first. Clients: what they can read first. */
const ANALYST_ORDER: Record<ReportStatus, number> = { 'not-created': 0, 'out-of-date': 1, published: 2, 'no-valuation': 3 };
const CLIENT_ORDER: Record<ReportStatus, number> = { published: 0, 'out-of-date': 0, 'not-created': 1, 'no-valuation': 2 };

function StatusChip({ status }: { status: ReportStatus }) {
  switch (status) {
    case 'published': return <Chip size="s" styleVariant="positive" leadingIcon={<Icon size="xs" tone="inherit"><icons.CheckCircle /></Icon>}>Published</Chip>;
    case 'out-of-date': return <Chip size="s" styleVariant="warning" leadingIcon={<Icon size="xs" tone="inherit"><icons.Warning /></Icon>}>Out of date</Chip>;
    case 'not-created': return <Chip size="s" leadingIcon={<Icon size="xs" tone="inherit"><icons.Pending /></Icon>}>Not created</Chip>;
    default: return <Chip size="s">No valuation</Chip>;
  }
}

function CreateReportModal({ onClose, options }: { onClose: () => void; options: { value: string; label: string }[] }) {
  const [query, setQuery] = useState('');
  const shown = options.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase()));
  return (
    <Modal open onClose={onClose} title="Create report" size="m" footer={<Button variant="tertiary" onClick={onClose}>Cancel</Button>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: space.s }}>
        <Text step="m" tone="secondary">Pick the company. Its Final Report tab opens, ready to create a PDF from the current valuation.</Text>
        <ComboboxPanel
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
          label="Company"
          searchPlaceholder="Find a company"
          items={shown}
          value=""
          query={query}
          onQueryChange={setQuery}
          onSelect={(id) => navigate(routes.company.finalReport(id), 'create')}
        />
      </div>
    </Modal>
  );
}

export function Reports({ params }: ScreenProps) {
  const [viewer] = useViewAs();
  const client = viewer === 'client';
  const [query, setQuery] = useState('');
  const [fund, setFund] = useState('all');
  const [status, setStatus] = useState<'all' | ReportStatus>('all');
  const [picking, setPicking] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [toast, setToast] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | undefined>(params.companyId);

  const all = useMemo(() => docCompanies().map((c) => {
    const date = companyById(c.id).asOf;
    const s = peekFinalReport(c.id, date);
    return { c, date, real: reportStatus(s), final: finalVersion(s) };
    // Re-read when the viewer changes: the switch is the prototype's only way to come back here with new data.
  }), [viewer]); // eslint-disable-line react-hooks/exhaustive-deps
  /** A client never sees "Out of date": the published final is what they have. */
  const statusOf = (r: (typeof all)[number]): ReportStatus => (client && r.real === 'out-of-date' ? 'published' : r.real);
  const order = client ? CLIENT_ORDER : ANALYST_ORDER;
  const funds = [...new Set(all.map((r) => r.c.fund).filter((f): f is string => !!f))].sort();
  const q = query.trim().toLowerCase();
  const rows = all
    .filter((r) => (!q || r.c.name.toLowerCase().includes(q)) && (fund === 'all' || r.c.fund === fund) && (status === 'all' || statusOf(r) === status))
    .sort((a, b) => order[statusOf(a)] - order[statusOf(b)] || a.c.name.localeCompare(b.c.name));
  const needWork = all.filter((r) => r.real === 'not-created' || r.real === 'out-of-date').length;
  const published = all.filter((r) => r.final).length;

  const currentId = selectedId ?? rows[0]?.c.id;
  const current = all.find((r) => r.c.id === currentId);
  const select = (id: string) => {
    setSelectedId(id);
    window.history.replaceState(null, '', href(routes.report(id)));
  };
  const statusOptions = (Object.keys(reportStatusLabel) as ReportStatus[]).filter((k) => !(client && k === 'out-of-date'));
  const download = () => current?.final && setToast(downloadNote(current.final));

  const preview = !current ? (
    <section aria-label="Report preview" style={{ ...columnPanel, flex: 1, minWidth: 0 }}>
      <EmptyState type="no-results" title="No company selected" body="Pick a company on the left to see its final report." />
    </section>
  ) : current.final ? (
    <ReportViewer
      key={current.final.id}
      company={companyById(current.c.id)}
      date={current.date}
      version={current.final}
      zoom={zoom}
      onDownload={download}
      headerEnd={
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: space.m }}>
          <Text as="span" step="s" tone="secondary">{`Measurement date ${current.date}`}</Text>
          <Link href={href(routes.company.finalReport(current.c.id))} size="s">Open in company</Link>
        </span>
      }
    />
  ) : (
    <section aria-label={`${current.c.name} final report`} style={{ ...columnPanel, flex: 1, minWidth: 0 }}>
      {current.real === 'no-valuation' ? (
        <EmptyState
          type="no-data"
          title={`No valuation for ${current.date}`}
          body={client ? 'There is no report for this measurement date.' : 'A final report needs a valuation for this measurement date. You can still upload a report made elsewhere on the company’s Final Report tab.'}
          icon={<Icon size="xl" tone="secondary"><icons.Description /></Icon>}
          actions={<Link href={href(routes.company.finalReport(current.c.id))}>Open in company</Link>}
        />
      ) : client ? (
        <EmptyState
          type="no-data"
          title={`The final report for ${current.date} isn’t ready yet`}
          body="It will appear here when it’s published."
          icon={<Icon size="xl" tone="secondary"><icons.Description /></Icon>}
        />
      ) : (
        <EmptyState
          type="no-data"
          title={`No final report for ${current.date}`}
          body={`Create a PDF from ${current.c.name}’s current valuation, or upload a report made elsewhere.`}
          icon={<Icon size="xl" tone="secondary"><icons.PictureAsPdf /></Icon>}
          actions={<Button variant="primary" onClick={() => navigate(routes.company.finalReport(current.c.id), 'create')}>Create PDF export</Button>}
        />
      )}
    </section>
  );

  return (
    <AppFrame
      area="reports"
      date="Most Recent (per company)"
      overlay={
        <>
          {picking && <CreateReportModal onClose={() => setPicking(false)} options={all.map((r) => ({ value: r.c.id, label: r.c.name }))} />}
          <ToastViewport aria-label="Notifications">
            {toast && <Toast tone="positive" onDismiss={() => setToast(null)}>{toast}</Toast>}
          </ToastViewport>
          <PrototypePanel />
        </>
      }
    >
      <PageHeader
        title="Reports"
        trailing={<ToolbarKebab />}
        actions={
          <>
            <ReportTools zoom={zoom} onZoom={setZoom} onDownload={download} disabled={!current?.final} />
            {!client && (
              <>
                <Button variant="secondary" size="xs" leadingIcon={<Icon size="s" tone="inherit"><icons.Description /></Icon>}>Request Report</Button>
                {/* Create Report starts from the company picked on the left; with none picked it asks which. */}
                <Button variant="primary" size="xs" leadingIcon={<Icon size="s" tone="inherit"><icons.Add /></Icon>}
                  onClick={() => (current ? navigate(routes.company.finalReport(current.c.id), 'create') : setPicking(true))}>
                  Create Report
                </Button>
              </>
            )}
          </>
        }
      />
      <main style={{ ...scrollBody, display: 'flex', gap: space.l, padding: space.l, alignItems: 'stretch' }}>
        {all.length === 0 ? (
          // Only an empty portfolio is empty: otherwise every company shows, so missing reports are visible.
          <EmptyState title="No reports yet" body="Add a company to the portfolio to create its first report." />
        ) : (
          <>
            <CompanyListPanel
              label="Companies"
              rows={rows.map((r) => ({ company: r.c, end: <StatusChip status={statusOf(r)} /> }))}
              selectedId={currentId}
              onSelect={select}
              query={query}
              onQueryChange={setQuery}
              filters={
                <>
                  <FilterSelect label="Fund" value={fund} onChange={setFund} options={[{ value: 'all', label: 'All funds' }, ...funds.map((f) => ({ value: f, label: f }))]} />
                  <FilterSelect<'all' | ReportStatus>
                    label="Status"
                    value={status}
                    onChange={setStatus}
                    options={[{ value: 'all', label: 'All statuses' }, ...statusOptions.map((k) => ({ value: k, label: reportStatusLabel[k] }))]}
                  />
                </>
              }
              summary={client
                ? `${rows.length} of ${all.length} companies · ${published} published`
                : `${rows.length} of ${all.length} companies · ${needWork} need a final report`}
            />
            {preview}
          </>
        )}
      </main>
    </AppFrame>
  );
}
