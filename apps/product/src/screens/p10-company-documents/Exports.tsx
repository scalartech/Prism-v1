/**
 * Company · Documents › Exports — the data files the platform generated (Excel
 * exports from Financials, Cap Table or Waterfall), out of the Documents tree
 * so Documents holds only what the client and the team uploaded. Same
 * structure as Documents: measurement-date folders, the company's date open.
 *
 * Every row carries its source screen, who exported it and when — the time
 * tells repeated names apart — newest first within each date. Rows download or
 * delete; Tier 3 selects all and downloads the selection. PDF report exports
 * are not here: they are versions on the Final Report tab.
 *
 * Prototype (proto:company-exports): no Figma frames yet. Data lives in this browser.
 */
import { useState } from 'react';
import {
  Button, ButtonIcon, Checkbox, ConfirmationDialog, EmptyState, Icon, Text, Toast, ToastViewport, icons, space,
} from '@scalar/design-system';
import type { ScreenProps } from '../../types.js';
import { companyById } from '../../data/fixtures.js';
import { CompanyLayout } from '../../shell/CompanyLayout.js';
import { companyDates } from '../p05-documents/data.js';
import { DateBand, DocRow } from '../p05-documents/parts.js';
import { CompanyDocsHeaderEnd, DocumentsSubNav } from './shared.js';
import { formatStamp, useExports, type ExportFile } from './exportsData.js';
import { usePageTitle } from './Requests.js';

export function Exports({ state, params }: ScreenProps) {
  const company = companyById(params.companyId);
  usePageTitle(`${company.name} — Exports`);
  const store = useExports(company.id);
  const files = state === 'empty' ? [] : store.files;
  // The company's date first, then its other dates and any date an export was filed under.
  const dates = [...new Set([company.asOf, ...companyDates, ...files.map((f) => f.measurementDate)])];
  const [open, setOpen] = useState<Set<string>>(new Set([company.asOf]));
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState<ExportFile | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const everyId = files.map((f) => f.id);
  const selected = everyId.filter((id) => checked.has(id));
  const allChecked = everyId.length > 0 && selected.length === everyId.length;
  const toggle = (set: Set<string>, key: string) => { const n = new Set(set); if (n.has(key)) n.delete(key); else n.add(key); return n; };
  const download = (n: number) => setToast(`${n} export${n === 1 ? '' : 's'} downloaded. The prototype produces no file.`);

  return (
    <CompanyLayout
      company={company}
      section="documents"
      date={company.asOf}
      headerEnd={<CompanyDocsHeaderEnd companyId={company.id} />}
      subNav={<DocumentsSubNav companyId={company.id} current="exports" />}
      // Only actions on this tab's content.
      subNavEnd={
        <>
          <Checkbox size="s" checked={allChecked} indeterminate={!allChecked && selected.length > 0} disabled={!files.length}
            onChange={(e) => setChecked(e.target.checked ? new Set(everyId) : new Set())}>
            {selected.length ? `${selected.length} selected` : 'Select all'}
          </Checkbox>
          <Button size="xs" variant="secondary" disabled={!selected.length} leadingIcon={<Icon size="s" tone="inherit"><icons.Download /></Icon>}
            onClick={() => { download(selected.length); setChecked(new Set()); }}>
            Download
          </Button>
        </>
      }
      dock={false}
      overlay={
        <>
          <ToastViewport aria-label="Notifications">
            {toast && <Toast tone="positive" onDismiss={() => setToast(null)}>{toast}</Toast>}
          </ToastViewport>
          <ConfirmationDialog
            open={confirm !== null}
            title="Delete this export?"
            confirmLabel="Delete export"
            destructive
            onCancel={() => setConfirm(null)}
            onConfirm={() => {
              if (confirm) { store.remove([confirm.id]); setChecked((s) => { const n = new Set(s); n.delete(confirm.id); return n; }); }
              setConfirm(null);
            }}
          >
            {`${confirm?.fileName ?? ''} is removed for everyone. Export it again from ${confirm?.sourceScreen ?? 'its screen'} if you need it.`}
          </ConfirmationDialog>
        </>
      }
    >
      <h2 className="scalar-visually-hidden">{`${company.name} — Exports`}</h2>
      <section aria-label={`${company.name} exports by measurement date`} style={{ display: 'flex', flexDirection: 'column', gap: space.s }}>
        {dates.map((d) => {
          const items = files.filter((f) => f.measurementDate === d).sort((a, b) => b.exportedAt.localeCompare(a.exportedAt));
          const isOpen = open.has(d);
          return (
            <div key={d} style={{ display: 'flex', flexDirection: 'column', gap: space.xs }}>
              <DateBand
                date={d}
                meta={`${items.length} export${items.length === 1 ? '' : 's'}`}
                expanded={isOpen}
                onToggle={() => setOpen((s) => toggle(s, d))}
              />
              {isOpen && (items.length ? (
                <div role="group" aria-label={`Exports for ${d}`} style={{ display: 'flex', flexDirection: 'column', paddingLeft: space.l }}>
                  {items.map((f) => (
                    <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: space.xs }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <DocRow
                          name={f.fileName}
                          draggable={false}
                          checked={checked.has(f.id)}
                          onCheckedChange={(v) => setChecked((s) => { const n = new Set(s); if (v) n.add(f.id); else n.delete(f.id); return n; })}
                          meta={[
                            { icon: <Icon size="xs" tone="inherit"><icons.TableView /></Icon>, label: f.sourceScreen },
                            { icon: <Icon size="xs" tone="inherit"><icons.Person /></Icon>, label: f.exportedBy },
                            { icon: <Icon size="xs" tone="inherit"><icons.Schedule /></Icon>, label: formatStamp(f.exportedAt) },
                          ]}
                          onDownload={() => download(1)}
                        />
                      </div>
                      <ButtonIcon variant="tertiary" size="s" label={`Delete ${f.fileName}`} onClick={() => setConfirm(f)}
                        icon={<Icon size="s" tone="inherit"><icons.Delete /></Icon>} />
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  type="no-data"
                  title={`No exports for ${d} yet`}
                  body="Exports you create from Financials, Cap Table or Waterfall appear here."
                  icon={<Icon size="xl" tone="secondary"><icons.TableView /></Icon>}
                />
              ))}
            </div>
          );
        })}
        <Text step="s" tone="tertiary">PDF reports are not listed here — they are versions on the Final Report tab.</Text>
      </section>
    </CompanyLayout>
  );
}
