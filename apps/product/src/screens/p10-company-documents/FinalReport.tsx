/**
 * Company · Documents › Final Report — one final report per company and
 * measurement date (implementation plan §5). The analyst picks it from the PDF
 * versions or uploads one; the client sees only that file, and it never
 * changes until the analyst picks again.
 *
 * Analyst: two panes — Report versions (newest first: name, source, created,
 * status, Set as final) and the PDF viewer for the version picked (the final
 * one by default), so a version is previewed before it is published. Tier 3 is the
 * one place for status and actions (Round 2 §4): after the tabs, the
 * out-of-date chip; on the right, View (zoom) | File (Download · Print) |
 * Manage (Upload report · Create PDF export). The published final is never
 * replaced by itself. Non-final versions can be deleted (soft, logged); the
 * final one can't.
 *
 * Client (View as: Client user, or `?state=client`): the viewer of the final
 * version only, with View and File — no versions, statuses, warnings, create,
 * upload or delete. Provenance sits in the viewer header ("Prepared by Scalar"
 * with the Scalar icon, or "Uploaded by …"), never in the tab label.
 *
 * Prototype (proto:company-final-report): no Figma frames yet. Data lives in
 * this browser; "Save a valuation change" stands in for the analyst editing
 * the valuation. Open questions: which saves count (2), drafts (3), what
 * "Scalar-made" means (6), client email on publish (7).
 */
import { useState } from 'react';
import {
  Button, ButtonIcon, Chip, ConfirmationDialog, Dropzone, EmptyState, FileRow, Heading, Icon, Modal,
  TertiaryMenuItem, Text, Toast, ToastViewport, Tooltip, color, icons, radius, space,
} from '@scalar/design-system';
import type { ScreenProps } from '../../types.js';
import { href } from '../../router.js';
import { routes } from '../../routes.js';
import { companyById } from '../../data/fixtures.js';
import { CompanyLayout } from '../../shell/CompanyLayout.js';
import { PrototypePanel } from '../../shell/PrototypePanel.js';
import { useViewAs } from '../../shell/viewAs.js';
import { columnPanel } from '../p05-documents/parts.js';
import { formatDay } from '../prototypes/request-portal/model.js';
import { CompanyDocsHeaderEnd, DocumentsSubNav, useNarrow } from './shared.js';
import { formatStamp } from './exportsData.js';
import { finalSpan, isOutOfDate, liveVersions, useFinalReport, type FinalReportStore, type ReportVersion } from './finalReportData.js';
import { ReportTools, ReportViewer, downloadNote } from './ReportViewer.js';
import { usePageTitle } from './Requests.js';

/* --- analyst: versions list ------------------------------------------------ */

function VersionItem({ s, version, selected, onSelect, onSetFinal, onDelete }: {
  s: FinalReportStore; version: ReportVersion; selected: boolean; onSelect: () => void; onSetFinal: () => void; onDelete: () => void;
}) {
  const isFinal = s.final?.id === version.id;
  const stale = isOutOfDate(s.state, version);
  const changed = formatDay(s.state.revision.savedAt);
  return (
    <li style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: space.xs, padding: space.s, borderRadius: radius.xs, border: `1px solid ${selected ? color.stroke.brand : color.stroke.control}`, background: selected ? color.bg.brandSubtle : color.bg.surface }}>
      <button
        type="button"
        aria-pressed={selected}
        onClick={onSelect}
        className="scalar-focusable"
        style={{ display: 'flex', flexDirection: 'column', gap: space['2xs'], background: 'none', border: 0, padding: 0, textAlign: 'left', cursor: 'pointer', font: 'inherit', color: 'inherit', minWidth: 0 }}
      >
        <Text as="span" step="m" weight="semiBold" tone={selected ? 'brand' : 'primary'} truncate>{version.fileName}</Text>
        <Text as="span" step="s" tone="secondary">{`v${version.versionNumber} · ${version.source === 'scalar_export' ? 'Scalar export' : `Uploaded by ${version.createdBy}`} · ${formatStamp(version.createdAt)}`}</Text>
        {version.originalName && <Text as="span" step="s" tone="tertiary" truncate>{version.originalName}</Text>}
      </button>
      <span style={{ display: 'flex', alignItems: 'center', gap: space.xs, flexWrap: 'wrap' }}>
        {isFinal && <Chip size="s" styleVariant="positive" leadingIcon={<Icon size="xs" tone="inherit"><icons.CheckCircle /></Icon>}>Final</Chip>}
        {version.source === 'upload'
          ? <Chip size="s">Uploaded</Chip>
          : stale
            ? <Chip size="s" styleVariant="warning" leadingIcon={<Icon size="xs" tone="inherit"><icons.Warning /></Icon>}>Out of date</Chip>
            : <Chip size="s" styleVariant="info">Current</Chip>}
        {stale && (
          <Text as="span" step="s" tone="secondary">
            {version.source === 'upload' ? 'Valuation changed after this upload' : `Valuation changed ${changed}`}
          </Text>
        )}
        <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: space['2xs'] }}>
          {!isFinal && <Button variant="tertiary" size="xs" onClick={onSetFinal}>Set as final</Button>}
          {isFinal ? (
            // The final version can't be deleted; the disabled button says why.
            <Tooltip content="Set another version as final to delete this one.">
              <ButtonIcon variant="tertiary" size="xs" disabled label={`Delete v${version.versionNumber} (final)`} icon={<Icon size="s" tone="inherit"><icons.Delete /></Icon>} />
            </Tooltip>
          ) : (
            <ButtonIcon variant="tertiary" size="xs" label={`Delete v${version.versionNumber}`} onClick={onDelete} icon={<Icon size="s" tone="inherit"><icons.Delete /></Icon>} />
          )}
        </span>
      </span>
    </li>
  );
}

/** After the tabs: the final report is out of date. The muted date drops first when narrow, then the chip shortens. */
function OutOfDate({ companyName, finalNumber, changedOn }: { companyName: string; finalNumber?: number; changedOn: string }) {
  const narrow = useNarrow(1440);
  const narrower = useNarrow(1280);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: space.s, marginLeft: space.s, whiteSpace: 'nowrap' }}>
      <Tooltip content={`${companyName} still sees v${finalNumber ?? ''} until you set a new final.`}>
        <Chip size="s" styleVariant="warning" leadingIcon={<Icon size="xs" tone="inherit"><icons.Warning /></Icon>}>
          {narrower ? 'Out of date' : 'Final report out of date'}
        </Chip>
      </Tooltip>
      {!narrow && <Text as="span" step="s" tone="secondary">{`Valuation changed ${changedOn}`}</Text>}
    </span>
  );
}

/* --- the screen ------------------------------------------------------------ */

export function FinalReport({ state, params }: ScreenProps) {
  const company = companyById(params.companyId);
  const date = company.asOf;
  const [viewer] = useViewAs();
  const client = state === 'client' || state === 'client-empty' || viewer === 'client';
  usePageTitle(`${company.name} — Final Report`);
  const s = useFinalReport(company.id, date, state);
  const versions = liveVersions(s.state).sort((a, b) => b.versionNumber - a.versionNumber);
  const [selectedId, setSelectedId] = useState<string | undefined>(s.final?.id ?? versions[0]?.id);
  const [uploading, setUploading] = useState(false);
  const [creating, setCreating] = useState(state === 'create');
  const [confirmFinal, setConfirmFinal] = useState<ReportVersion | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ReportVersion | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const selected = versions.find((v) => v.id === selectedId) ?? s.final ?? versions[0];
  /** What the viewer shows: the client only ever sees the final version. */
  const shown = client ? (state === 'client-empty' ? undefined : s.final) : selected;

  const createExport = () => {
    const v = s.createExport();
    setSelectedId(v.id);
    setCreating(false);
    setToast(`v${v.versionNumber} created from the current valuation. Set it as final to publish it to ${company.name}.`);
  };
  const setFinal = (v: ReportVersion) => {
    s.setFinal(v.id);
    setConfirmFinal(null);
    setSelectedId(v.id);
    setToast(`v${v.versionNumber} is now the final report. ${company.name} sees it on its Final Report tab.`);
  };
  const askFinal = (v: ReportVersion) => { if (s.final && s.final.id !== v.id) setConfirmFinal(v); else setFinal(v); };
  const deleteVersion = (v: ReportVersion) => {
    setConfirmDelete(null);
    if (!s.deleteVersion(v.id)) return;
    if (selectedId === v.id) setSelectedId(undefined);
    setToast(`v${v.versionNumber} deleted. The deletion is recorded in the audit log.`);
  };
  const span = confirmDelete ? finalSpan(s.state, confirmDelete.id) : null;

  const overlay = (
    <>
      <ToastViewport aria-label="Notifications">
        {toast && <Toast tone="positive" onDismiss={() => setToast(null)}>{toast}</Toast>}
      </ToastViewport>
      <ConfirmationDialog
        open={confirmFinal !== null}
        title={`Set v${confirmFinal?.versionNumber ?? ''} as final?`}
        confirmLabel="Set as final"
        onCancel={() => setConfirmFinal(null)}
        onConfirm={() => confirmFinal && setFinal(confirmFinal)}
      >
        {`Clients will see v${confirmFinal?.versionNumber ?? ''} instead of v${s.final?.versionNumber ?? ''}. The change is recorded in the audit log.`}
      </ConfirmationDialog>
      <ConfirmationDialog
        open={confirmDelete !== null}
        title={`Delete v${confirmDelete?.versionNumber ?? ''}?`}
        confirmLabel="Delete"
        destructive
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && deleteVersion(confirmDelete)}
      >
        {`This can’t be undone. ${span
          ? `Clients saw this version from ${formatDay(span.from)} to ${formatDay(span.to ?? new Date().toISOString())}.`
          : 'Clients never saw this version.'}`}
      </ConfirmationDialog>
      <ConfirmationDialog
        open={creating}
        title="Create a PDF export?"
        confirmLabel="Create PDF export"
        onCancel={() => setCreating(false)}
        onConfirm={createExport}
      >
        {`A PDF of ${company.name}’s valuation for ${date}, as it stands now, is added to Report versions. Clients don’t see it until you set it as final.`}
      </ConfirmationDialog>
      <UploadReportModal
        open={uploading}
        onClose={() => setUploading(false)}
        onDone={(name) => {
          const v = s.upload(name);
          setSelectedId(v.id);
          setUploading(false);
          setToast(`${name} added as v${v.versionNumber}. Set it as final to publish it to ${company.name}.`);
        }}
      />
      <PrototypePanel>
        <Button size="s" variant="tertiary" onClick={() => { s.saveValuationChange(); setToast('Valuation change saved. What the client sees did not change.'); }}>Save a valuation change</Button>
        <Button size="s" variant="tertiary" onClick={() => { s.reset(); setSelectedId(undefined); }}>Reset prototype data</Button>
      </PrototypePanel>
    </>
  );

  const download = () => shown && setToast(downloadNote(shown));
  const manage = !client && (
    <>
      <Button size="xs" variant="secondary" leadingIcon={<Icon size="s" tone="inherit"><icons.UploadFile /></Icon>} onClick={() => setUploading(true)}>
        Upload report
      </Button>
      <Button size="xs" variant="primary" leadingIcon={<Icon size="s" tone="inherit"><icons.PictureAsPdf /></Icon>} onClick={createExport} disabled={!s.state.hasValuation}>
        Create PDF export
      </Button>
    </>
  );
  const tools = <ReportTools zoom={zoom} onZoom={setZoom} onDownload={download} disabled={!shown} manage={manage || undefined} />;

  /* ---- client: the final version only ---- */
  if (client) {
    return (
      <CompanyLayout
        company={company}
        section="documents"
        date={date}
        subNav={<TertiaryMenuItem current href={href(routes.company.finalReport(company.id))}>Final Report</TertiaryMenuItem>}
        subNavEnd={tools}
        dock={false}
        overlay={overlay}
      >
        <h2 className="scalar-visually-hidden">{`${company.name} — Final Report`}</h2>
        {shown ? (
          <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
            <ReportViewer company={company} date={date} version={shown} zoom={zoom} failed={state === 'render-failed'} onDownload={download} />
          </div>
        ) : (
          <EmptyState
            type="no-data"
            title={`Your final report for ${date} isn’t ready yet`}
            body="It will appear here when it’s published."
            icon={<Icon size="xl" tone="secondary"><icons.Description /></Icon>}
          />
        )}
      </CompanyLayout>
    );
  }

  /* ---- analyst ---- */
  return (
    <CompanyLayout
      company={company}
      section="documents"
      date={date}
      headerEnd={<CompanyDocsHeaderEnd companyId={company.id} />}
      subNav={
        <>
          <DocumentsSubNav companyId={company.id} current="final-report" />
          {s.status === 'out-of-date' && (
            <OutOfDate companyName={company.name} finalNumber={s.final?.versionNumber} changedOn={formatDay(s.state.revision.savedAt)} />
          )}
        </>
      }
      subNavEnd={tools}
      dock={false}
      overlay={overlay}
    >
      <h2 className="scalar-visually-hidden">{`${company.name} — Final Report`}</h2>
      {!s.state.hasValuation ? (
        <EmptyState
          type="no-data"
          title={`No valuation for ${date}`}
          body="A final report needs a valuation for this measurement date. You can still upload a report made elsewhere."
          icon={<Icon size="xl" tone="secondary"><icons.Description /></Icon>}
          actions={<Button variant="secondary" onClick={() => setUploading(true)}>Upload report</Button>}
        />
      ) : versions.length === 0 ? (
        <EmptyState
          type="no-data"
          title={`No final report for ${date}`}
          body="Create a PDF from the current valuation or upload a report made elsewhere."
          icon={<Icon size="xl" tone="secondary"><icons.PictureAsPdf /></Icon>}
          actions={
            <>
              <Button variant="primary" onClick={createExport}>Create PDF export</Button>
              <Button variant="secondary" onClick={() => setUploading(true)}>Upload report</Button>
            </>
          }
        />
      ) : (
        <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 2.6fr)', gap: space.l, alignItems: 'stretch' }}>
          <section aria-labelledby="report-versions" style={{ ...columnPanel, display: 'flex', flexDirection: 'column', gap: space.s }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: space.s }}>
              <Heading level={2} step="m" id="report-versions">Report versions</Heading>
              <Text as="span" step="s" tone="secondary">{versions.length}</Text>
            </div>
            <Text step="s" tone="secondary">
              {s.final ? `${company.name} sees v${s.final.versionNumber}. One version per measurement date is final.` : `Nothing is published yet. Set a version as final to share it with ${company.name}.`}
            </Text>
            <ul aria-labelledby="report-versions" style={{ margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: space.xs }}>
              {versions.map((v) => (
                <VersionItem key={v.id} s={s} version={v} selected={v.id === selected?.id}
                  onSelect={() => setSelectedId(v.id)} onSetFinal={() => askFinal(v)} onDelete={() => setConfirmDelete(v)} />
              ))}
            </ul>
          </section>
          {selected && <ReportViewer key={selected.id} company={company} date={date} version={selected} zoom={zoom} failed={state === 'render-failed'} onDownload={download} />}
        </div>
      )}
    </CompanyLayout>
  );
}

/* --- upload ---------------------------------------------------------------- */

function UploadReportModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: (name: string) => void }) {
  const [file, setFile] = useState<File | null>(null);
  return (
    <Modal
      open={open}
      onClose={() => { setFile(null); onClose(); }}
      title="Upload report"
      size="m"
      dismissOnScrimClick={!file}
      footer={
        <>
          <Button variant="tertiary" onClick={() => { setFile(null); onClose(); }}>Cancel</Button>
          <Button variant="primary" disabled={!file} onClick={() => { if (file) onDone(file.name); setFile(null); }}>Add version</Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: space.s }}>
        <Dropzone
          accept=".pdf"
          hint="PDF · max 250 MB"
          prompt={(browse) => <>Drag &amp; drop a report made elsewhere or {browse('select a file')}</>}
          onFiles={(list) => setFile(list[0] ?? null)}
        />
        {file && <FileRow name={file.name} meta={[{ label: `${Math.max(1, Math.round(file.size / 1024))} KB` }]} onMenu={() => setFile(null)} />}
        <Text step="s" tone="secondary">The upload becomes a new version. Clients see it only once you set it as final.</Text>
      </div>
    </Modal>
  );
}
