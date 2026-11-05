/**
 * Valuations (firm): every company's latest valuation in one configurable
 * grid — date, open process tasks, status, approaches and the headline values
 * — for all 200 companies in the database in one grid (no pagination), with saved views
 * and an Add Columns picker at the end of the grid.
 */
import { useMemo, useState } from 'react';
import {
  Banner, Button, Checkbox, Modal, ModalSearch, Overline, TaskPill, Text, icons, space,
} from '@scalar/design-system';
import type { ScreenProps } from '../../types.js';
import { AppFrame, PageBody } from '../../shell/AppFrame.js';
import { navigate } from '../../router.js';
import { routes } from '../../routes.js';
import { PortfolioGrid, type GridRow } from '../p02-intelligence/PortfolioGrid.js';
import { ExportMenuItems, PortfolioHeader, PublishedNote, SavedViewsBar } from '../p02-intelligence/chrome.js';
import { companyHref, StatusCell } from '../p02-intelligence/cells.js';
import { columnCatalogue, inFrameOrder } from '../p02-intelligence/data.js';
import type { Company } from '../../data/fixtures.js';
import { VALUATIONS_FRAME, valuationColumns, valuationValues } from './data.js';
import { openTasksOf } from '../p10-company-documents/requestData.js';
import { BulkMarketDateModal } from '../prototypes/bulk-market-date/BulkMarketDateModal.js';
import { usFromIso } from '../../domain/model.js';
import { useMoney } from '../../shell/displayUnit.js';

const ORDER = inFrameOrder(VALUATIONS_FRAME);
/** Total columns the catalogue offers (the modal's "N of 140 available"). */
const AVAILABLE = 140;

/**
 * Open process-management tasks: what the company still owes on its information
 * request (documents, questions), read live from the same list as Company ›
 * Documents › Requests. Each pill opens that list, filtered to what is pending
 * (questions are requests too, so both pills land on Requests).
 */
function Tasks({ company }: { company: Company }) {
  const t = openTasksOf(company.id);
  if (!t) return <Text step="s" tone="tertiary">No tasks required</Text>;
  return (
    <span style={{ display: 'inline-flex', gap: space.xs }}>
      {t.documents > 0 && (
        <TaskPill
          tone="negative"
          label={`${company.name}: ${t.documents} document request${t.documents === 1 ? '' : 's'} open`}
          count={t.documents}
          icon={<icons.Description />}
          onClick={() => navigate(routes.company.requests(company.id), 'pending')}
        />
      )}
      {t.questions > 0 && (
        <TaskPill
          tone="negative"
          label={`${company.name}: ${t.questions} open question${t.questions === 1 ? '' : 's'}`}
          count={t.questions}
          icon={<icons.QuestionMark />}
          onClick={() => navigate(routes.company.requests(company.id), 'pending')}
        />
      )}
    </span>
  );
}

function AddColumnsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [picked, setPicked] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const catalogue = columnCatalogue.map((g) => ({ ...g, items: g.items.filter((i) => i !== 'Valuation Date') }));
  const toggle = (c: string) => setPicked((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]));
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add Columns"
      size="m"
      footer={
        <>
          <Text step="s" tone="secondary">{picked.length} of {AVAILABLE} available selected</Text>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: space.s }}>
            <Button variant="tertiary" onClick={onClose}>Cancel</Button>
            <Button variant="primary" disabled={!picked.length} onClick={onClose}>Add Columns</Button>
          </div>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: space.xs }}>
        <ModalSearch placeholder="Search columns…" aria-label="Search columns" autoFocus value={query} onChange={(e) => setQuery(e.target.value)} />
        {catalogue.map((g) => {
          const items = g.items.filter((i) => i.toLowerCase().includes(q));
          if (!items.length) return null;
          return (
            <div key={g.group} style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ paddingTop: space.s }}><Overline>{g.group}</Overline></div>
              {items.map((i) => (
                <Checkbox key={i} size="s" checked={picked.includes(i)} onChange={() => toggle(i)}>{i}</Checkbox>
              ))}
            </div>
          );
        })}
      </div>
    </Modal>
  );
}

export function FirmValuations({ state }: ScreenProps) {
  // Money follows the Currency Selector.
  const money = useMoney();
  const atEnd = state !== 'default';
  const [view, setView] = useState('Firm Valuations');
  const [viewMenu, setViewMenu] = useState<string | undefined>();
  const [actions, setActions] = useState(false);
  const [adding, setAdding] = useState(state === 'add-columns');
  const [bulk, setBulk] = useState(false);
  const [bulkDone, setBulkDone] = useState<{ count: number; date: string } | null>(null);

  const rows: GridRow[] = useMemo(() => ORDER.map((c) => ({
    id: c.id,
    label: c.name,
    href: companyHref(c, routes.company.valuationSummary),
    sortText: c.name,
    values: {
      ...valuationValues(c),
      process: <Tasks company={c} />,
      status: <StatusCell company={c} />,
    },
  })), []);

  return (
    <AppFrame
      area="valuations"
      overlay={
        <>
          <AddColumnsModal open={adding} onClose={() => setAdding(false)} />
          <BulkMarketDateModal open={bulk} onClose={() => setBulk(false)} onDone={setBulkDone} />
        </>
      }
    >
      <PortfolioHeader
        title="Valuations"
        actionsOpen={actions}
        onActionsOpen={setActions}
        actions={<ExportMenuItems onBulk={() => { setActions(false); setBulk(true); }} />}
      />
      <SavedViewsBar
        views={['Firm Valuations', 'Steven Valuation View']}
        current={view}
        onSelect={setView}
        menuFor={viewMenu}
        onMenuFor={setViewMenu}
        onAdd={() => navigate(routes.intelligence.summaries, 'create-view')}
        onEdit={() => setAdding(true)}
      />
      <PageBody gap={space.m}>
        {bulkDone && (
          <Banner tone="positive" title={`Market date updated to ${usFromIso(bulkDone.date)} for ${bulkDone.count} compan${bulkDone.count === 1 ? 'y' : 'ies'}`} onDismiss={() => setBulkDone(null)}>
            Their measurements, versions and transactions are unchanged.
          </Banner>
        )}
        <PortfolioGrid
          label="Firm valuations"
          money={money.amount}
          firstColumn="Firm Portfolio Summary"
          columns={valuationColumns}
          rows={rows}
          total={{}}
          scrollTo={atEnd ? 'end' : undefined}
          onAddColumn={() => setAdding(true)}
          addColumnLabel="Add Column"
          addColumnSelected={adding}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}><PublishedNote /></div>
      </PageBody>
    </AppFrame>
  );
}
