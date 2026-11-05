/**
 * Reports — the portfolio roll-up of every company's Final Report
 * (implementation plan §6). One row per company for the measurement date in
 * the header's selector (each company's own latest date under "Most Recent"),
 * so there is no second date control on the page; older dates live inside the
 * company. Rows that need work — Not created, Out of date — come first.
 *
 * A company opens its Final Report tab. Create Report picks a company and
 * lands there with the create flow open. Request Report is unchanged (open
 * question 4: what it produces).
 */
import { useMemo, useState } from 'react';
import {
  Button, Cell, Chip, ColumnHeader, ComboboxPanel, DataGrid, EmptyState, Icon, Input, Modal, Row, RowHeader, Text, icons, space,
} from '@scalar/design-system';
import { href, navigate } from '../../../router.js';
import { routes } from '../../../routes.js';
import { companyById } from '../../../data/fixtures.js';
import { ABSENCE_LABEL } from '../../../domain/display.js';
import { AppFrame, scrollBody } from '../../../shell/AppFrame.js';
import { PageHeader } from '../../../shell/PageHeader.js';
import { ToolbarKebab } from '../../../shell/Toolbar.js';
import { docCompanies } from '../../p05-documents/data.js';
import { FilterSelect } from '../../p05-documents/parts.js';
import { formatDay } from '../request-portal/model.js';
import {
  finalVersion, peekFinalReport, provenanceOf, reportStatus, reportStatusLabel, type ReportStatus,
} from '../../p10-company-documents/finalReportData.js';

/** Rows that need work first. */
const PRIORITY: Record<ReportStatus, number> = { 'not-created': 0, 'out-of-date': 1, published: 2, 'no-valuation': 3 };

function StatusChip({ status }: { status: ReportStatus }) {
  switch (status) {
    case 'published': return <Chip size="s" styleVariant="positive" leadingIcon={<Icon size="xs" tone="inherit"><icons.CheckCircle /></Icon>}>Published</Chip>;
    case 'out-of-date': return <Chip size="s" styleVariant="warning" leadingIcon={<Icon size="xs" tone="inherit"><icons.Warning /></Icon>}>Out of date</Chip>;
    case 'not-created': return <Chip size="s" leadingIcon={<Icon size="xs" tone="inherit"><icons.Pending /></Icon>}>Not created</Chip>;
    default: return <Text as="span" step="s" tone="tertiary">{reportStatusLabel[status]}</Text>;
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

export function Reports() {
  const [query, setQuery] = useState('');
  const [fund, setFund] = useState('all');
  const [status, setStatus] = useState<'all' | ReportStatus>('all');
  const [creating, setCreating] = useState(false);

  const all = useMemo(() => docCompanies().map((c) => {
    const date = companyById(c.id).asOf;
    const s = peekFinalReport(c.id, date);
    return { c, date, status: reportStatus(s), final: finalVersion(s), publishedAt: s.final?.publishedAt };
  }), []);
  const funds = [...new Set(all.map((r) => r.c.fund).filter((f): f is string => !!f))].sort();
  const q = query.trim().toLowerCase();
  const rows = all
    .filter((r) => (!q || r.c.name.toLowerCase().includes(q)) && (fund === 'all' || r.c.fund === fund) && (status === 'all' || r.status === status))
    .sort((a, b) => PRIORITY[a.status] - PRIORITY[b.status] || a.c.name.localeCompare(b.c.name));
  const needWork = all.filter((r) => r.status === 'not-created' || r.status === 'out-of-date').length;

  return (
    <AppFrame area="reports" overlay={creating && <CreateReportModal onClose={() => setCreating(false)} options={all.map((r) => ({ value: r.c.id, label: r.c.name }))} />}>
      <PageHeader
        title="Reports"
        trailing={<ToolbarKebab />}
        actions={
          <>
            <Button variant="secondary" size="xs" leadingIcon={<Icon size="s" tone="inherit"><icons.Description /></Icon>}>Request Report</Button>
            <Button variant="primary" size="xs" leadingIcon={<Icon size="s" tone="inherit"><icons.Add /></Icon>} onClick={() => setCreating(true)}>Create Report</Button>
          </>
        }
      />
      <main style={{ ...scrollBody, padding: space.l, display: 'flex', flexDirection: 'column', gap: space.m }}>
        {all.length === 0 ? (
          // Only an empty portfolio is empty: otherwise every company shows, so missing reports are visible.
          <EmptyState title="No reports yet" body="Add a company to the portfolio to create its first report." />
        ) : (
          <>
            <div role="toolbar" aria-label="Find reports" style={{ display: 'flex', alignItems: 'center', gap: space.s, flexWrap: 'wrap' }}>
              <div style={{ width: '22vw' }}>
                <Input aria-label="Find company" placeholder="Find company" value={query} onChange={(e) => setQuery(e.target.value)}
                  leadingIcon={<Icon size="s" tone="secondary"><icons.Search /></Icon>} />
              </div>
              <FilterSelect label="Fund" value={fund} onChange={setFund} options={[{ value: 'all', label: 'All funds' }, ...funds.map((f) => ({ value: f, label: f }))]} />
              <FilterSelect<'all' | ReportStatus>
                label="Final report"
                value={status}
                onChange={setStatus}
                options={[{ value: 'all', label: 'All statuses' }, ...(Object.keys(reportStatusLabel) as ReportStatus[]).map((k) => ({ value: k, label: reportStatusLabel[k] }))]}
              />
              <Text as="span" step="s" tone="secondary" style={{ marginLeft: 'auto' }}>
                {`${rows.length} of ${all.length} companies · ${needWork} need a final report`}
              </Text>
            </div>
            {rows.length === 0 ? (
              <EmptyState type="no-results" title="No companies match" body="Clear the search or the filters to see every company." icon={<Icon size="xl" tone="secondary"><icons.FilterAlt /></Icon>} />
            ) : (
              <DataGrid
                label="Final reports by company"
                head={
                  <>
                    <ColumnHeader grow={3}>Company</ColumnHeader>
                    <ColumnHeader>Fund</ColumnHeader>
                    <ColumnHeader>Measurement date</ColumnHeader>
                    <ColumnHeader>Final report</ColumnHeader>
                    <ColumnHeader>Source</ColumnHeader>
                    <ColumnHeader>Last updated</ColumnHeader>
                  </>
                }
              >
                {rows.map((r, i) => (
                  <Row key={r.c.id} zebra={i % 2 === 1}>
                    <RowHeader href={href(routes.company.finalReport(r.c.id))}>{r.c.name}</RowHeader>
                    <Cell>{r.c.fund ? <Chip size="s">{r.c.fund}</Chip> : ABSENCE_LABEL['not-entered']}</Cell>
                    <Cell>{r.date}</Cell>
                    <Cell><StatusChip status={r.status} /></Cell>
                    <Cell>{r.final ? provenanceOf(r.final) : ABSENCE_LABEL['not-entered']}</Cell>
                    <Cell>{r.publishedAt ? formatDay(r.publishedAt) : ABSENCE_LABEL['not-entered']}</Cell>
                  </Row>
                ))}
              </DataGrid>
            )}
          </>
        )}
      </main>
    </AppFrame>
  );
}
