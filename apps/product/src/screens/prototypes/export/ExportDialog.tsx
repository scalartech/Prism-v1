/**
 * Excel Export (domain-logic.md §10, training C17).
 *
 * DOC: formulas or hard-coded values, and a choice of pages. The dialog states
 * the context it exports — measurement, market date, versions, currency and
 * workflow status — so a draft is never mistaken for a published figure.
 * The prototype produces no file; it confirms what would be exported and saves
 * the export to the company's Exports tab ("Export saved · View in Exports").
 * PDF report exports go to Final Report's versions instead.
 */
import { useState } from 'react';
import {
  Banner, Button, Checkbox, Link, Modal, Radio, RadioGroup, Text, space,
} from '@scalar/design-system';
import { href } from '../../../router.js';
import { routes } from '../../../routes.js';
import { addExport, type ExportFile } from '../../p10-company-documents/exportsData.js';
import type { Company } from '../../../data/fixtures.js';
import { useValuationContext } from '../../../domain/context.js';
import { isReported, usFromIso } from '../../../domain/model.js';
import { statusView } from '../../p02-intelligence/data.js';
import { closeExport, useExportOpen } from './state.js';

const PAGES = ['Financials', 'Cap Table', 'Fund Ownership', 'Breakpoints', 'Cash Flow Ledger', 'Valuation Summary', 'Conclusions'];

export function ExportDialog({ company }: { company: Company }) {
  return useExportOpen(company.id) ? <ExportForm company={company} /> : null;
}

function ExportForm({ company }: { company: Company }) {
  const v = useValuationContext(company);
  const [mode, setMode] = useState('formulas');
  const [pages, setPages] = useState<string[]>(PAGES);
  const [done, setDone] = useState<ExportFile | null>(null);
  const status = v.valuation?.status ?? 'draft';
  const toggle = (p: string) => setPages((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));

  const context = [
    ['Measurement', usFromIso(v.measurement.date)],
    ['Market date', usFromIso(v.measurement.marketDate)],
    ['Financials version', v.financial.name],
    ['Cap table version', `${v.capTable.name} (with ${v.ownership.name})`],
    ['Valuation version', v.valuation?.name ?? 'None'],
    ['Status', statusView[status].label ?? status],
    ['Currency', 'USD, $ thousands'],
  ];

  return (
    <Modal
      open
      onClose={closeExport}
      title="Excel Export"
      size="l"
      footer={
        <>
          <Button variant="secondary" onClick={closeExport}>{done ? 'Close' : 'Cancel'}</Button>
          {!done && <Button onClick={() => setDone(addExport(company.id, usFromIso(v.measurement.date), pages))} disabled={!pages.length}>Export to Excel</Button>}
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: space.l }}>
        {!isReported(v.valuation) && (
          <Banner tone="warning" title="This version is not published">
            Its values are exported as they stand and are labelled with their status. They do not appear in published summaries.
          </Banner>
        )}
        <RadioGroup label="Cell contents" value={mode} onValueChange={setMode}>
          <Radio value="formulas">Formulas — cells keep their formulas</Radio>
          <Radio value="values">Values (hard-coded) — cells hold the resolved numbers</Radio>
        </RadioGroup>
        <fieldset style={{ border: 0, padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: space.xs }}>
          <legend><Text step="m" weight="semiBold">Pages</Text></legend>
          {PAGES.map((p) => <Checkbox key={p} checked={pages.includes(p)} onChange={() => toggle(p)}>{p}</Checkbox>)}
        </fieldset>
        <div>
          <Text step="m" weight="semiBold">Exported context</Text>
          <dl style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', columnGap: space.l, rowGap: space.xs, margin: 0, marginTop: space.xs }}>
            {context.map(([k, val]) => (
              <div key={k} style={{ display: 'contents' }}>
                <dt><Text step="s" tone="secondary">{k}</Text></dt>
                <dd style={{ margin: 0 }}><Text step="s">{val}</Text></dd>
              </div>
            ))}
          </dl>
        </div>
        {done && (
          <Banner tone="positive" title="Export saved">
            {`${done.fileName}: ${pages.length} page(s), ${mode === 'formulas' ? 'with formulas' : 'as hard-coded values'}. The prototype does not produce a file. `}
            <Link href={href(routes.company.exports(company.id))} onClick={closeExport}>View in Exports</Link>
          </Banner>
        )}
      </div>
    </Modal>
  );
}
