/**
 * Company · Documents › Final Report — one final report per company and
 * measurement date (implementation plan §5). The analyst picks it from the PDF
 * versions or uploads one; the client sees only that file, and it never
 * changes until the analyst picks again.
 *
 * Analyst: two panes — Report versions (newest first: name, source, created,
 * status, Set as final) and the PDF viewer for the version picked (the final
 * one by default), so a version is previewed before it is published. Tier 3:
 * Create PDF export · Upload report. When the final version goes out of date a
 * warning banner says so, and the tab carries a warning mark; the published
 * final is never replaced by itself.
 *
 * Client (`?state=client`): the viewer of the final version only — no
 * versions, statuses or warnings. Provenance sits in the viewer header
 * ("Prepared by Scalar" with the Scalar mark, or "Uploaded by …"), never in the
 * tab label.
 *
 * Prototype (proto:company-final-report): no Figma frames yet. Data lives in
 * this browser; "Save a valuation change" stands in for the analyst editing
 * the valuation. Open questions: which saves count (2), drafts (3), what
 * "Scalar-made" means (6), client email on publish (7).
 */
import { useEffect, useState } from 'react';
import {
  Alert, Banner, Button, ButtonIcon, Chip, ConfirmationDialog, Dropzone, EmptyState, FileRow, Heading, Icon, Modal,
  PageStepper, TertiaryMenuItem, Text, Toast, ToastViewport, ZoomControl, color, elevation, icons, radius, size, space,
} from '@scalar/design-system';
import type { ScreenProps } from '../../types.js';
import { href } from '../../router.js';
import { routes } from '../../routes.js';
import { companyById, type Company } from '../../data/fixtures.js';
import { CompanyLayout } from '../../shell/CompanyLayout.js';
import { columnPanel } from '../p05-documents/parts.js';
import { formatDay } from '../prototypes/request-portal/model.js';
import { CompanyDocsHeaderEnd, DocumentsSubNav } from './shared.js';
import { formatStamp } from './exportsData.js';
import { isOutOfDate, provenanceOf, useFinalReport, type FinalReportStore, type ReportVersion } from './finalReportData.js';
import { usePageTitle } from './Requests.js';

/* --- viewer ---------------------------------------------------------------- */

function Provenance({ version }: { version: ReportVersion }) {
  return version.source === 'scalar_export' ? (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: space.xs }}>
      <img src="./assets/scalar-wordmark-navy.png" alt="Scalar" style={{ height: size.icon.s }} />
      <Text as="span" step="s" tone="secondary">Prepared by Scalar</Text>
    </span>
  ) : (
    <Chip size="s" leadingIcon={<Icon size="xs" tone="inherit"><icons.Person /></Icon>}>{provenanceOf(version)}</Chip>
  );
}

/** The report header (name · provenance · date · Download · Print) above the embedded PDF. */
function ReportViewer({ company, date, version, failed, notify }: {
  company: Company; date: string; version: ReportVersion; failed?: boolean; notify: (t: string) => void;
}) {
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  useEffect(() => setPage(1), [version.id]);
  return (
    <section aria-label={`Report preview: ${version.fileName}`} style={{ ...columnPanel, flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: space.s }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: space.m, flexWrap: 'wrap' }}>
        <Icon size="m" tone="negative"><icons.PictureAsPdf /></Icon>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: space['2xs'] }}>
          <Heading level={2} step="m" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{version.fileName}</Heading>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: space.s, flexWrap: 'wrap' }}>
            <Provenance version={version} />
            <Text as="span" step="s" tone="secondary">{formatStamp(version.createdAt)}</Text>
          </span>
        </div>
        <Button variant="secondary" size="s" leadingIcon={<Icon size="s" tone="inherit"><icons.Download /></Icon>} onClick={() => notify(`${version.fileName} downloaded. The prototype produces no file.`)}>
          Download
        </Button>
        <ButtonIcon variant="tertiary" size="s" label="Print report" onClick={() => window.print()} icon={<Icon size="s" tone="inherit"><icons.Print /></Icon>} />
      </div>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: space.m, padding: space.m, background: color.bg.subtle, border: `1px solid ${color.stroke.subtle}`, borderRadius: radius.s, overflow: 'auto' }}>
        {failed ? (
          // Never a blank frame: if the PDF can't render, the file is still one click away.
          <Alert tone="warning" title="This report can’t be shown here">
            <span style={{ display: 'flex', flexDirection: 'column', gap: space.s, alignItems: 'flex-start' }}>
              The PDF could not be rendered in the browser. Download it to read it.
              <Button variant="secondary" size="s" leadingIcon={<Icon size="s" tone="inherit"><icons.Download /></Icon>} onClick={() => notify(`${version.fileName} downloaded. The prototype produces no file.`)}>
                {`Download ${version.fileName}`}
              </Button>
            </span>
          </Alert>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <PageStepper page={page} total={18} onChange={setPage} />
              <ZoomControl value={zoom} onChange={setZoom} onFit={() => setZoom(100)} />
            </div>
            <article
              aria-label={`Page ${page} of 18`}
              style={{
                display: 'flex', flexDirection: 'column', gap: space.l, padding: space['2xl'],
                background: color.bg.surface, border: `1px solid ${color.stroke.default}`, borderRadius: radius.xs, boxShadow: elevation.raised,
              }}
            >
              <Text step="s" tone="secondary">{version.source === 'scalar_export' ? 'Prepared by Scalar' : `Uploaded by ${version.createdBy}`}</Text>
              <Heading level={3} step="3xl">{company.name}</Heading>
              <Text step="l" tone="secondary">{`Valuation report · Measurement date ${date}`}</Text>
              <Heading level={4} step="l" weight="regular">{page === 1 ? 'Summary of conclusions' : `Section ${page}`}</Heading>
              <Text step="m">
                Page {page} of the report at {zoom}%. The PDF renders here; use the page stepper to move through it and the zoom
                control to fit it to the pane.
              </Text>
              <Text step="m" tone="secondary">
                Figures in this report are the ones in the valuation when the PDF was made. Later changes to the valuation do not
                change this file.
              </Text>
            </article>
          </>
        )}
      </div>
    </section>
  );
}

/* --- analyst: versions list ------------------------------------------------ */

function VersionItem({ s, version, selected, onSelect, onSetFinal }: {
  s: FinalReportStore; version: ReportVersion; selected: boolean; onSelect: () => void; onSetFinal: () => void;
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
        {!isFinal && (
          <Button variant="tertiary" size="xs" style={{ marginLeft: 'auto' }} onClick={onSetFinal}>Set as final</Button>
        )}
      </span>
    </li>
  );
}

/* --- the screen ------------------------------------------------------------ */

export function FinalReport({ state, params }: ScreenProps) {
  const company = companyById(params.companyId);
  const date = company.asOf;
  const client = state === 'client' || state === 'client-empty';
  usePageTitle(`${company.name} — Final Report`);
  const s = useFinalReport(company.id, date, state);
  const versions = [...s.state.versions].sort((a, b) => b.versionNumber - a.versionNumber);
  const [selectedId, setSelectedId] = useState<string | undefined>(s.final?.id ?? versions[0]?.id);
  const [uploading, setUploading] = useState(false);
  const [creating, setCreating] = useState(state === 'create');
  const [confirmFinal, setConfirmFinal] = useState<ReportVersion | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const selected = versions.find((v) => v.id === selectedId) ?? s.final ?? versions[0];

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
    </>
  );

  /* ---- client: the final version only ---- */
  if (client) {
    return (
      <CompanyLayout
        company={company}
        section="documents"
        date={date}
        subNav={<TertiaryMenuItem current href={href(routes.company.finalReport(company.id))}>Final Report</TertiaryMenuItem>}
        subNavEnd={<Chip size="s" leadingIcon={<Icon size="xs" tone="inherit"><icons.Visibility /></Icon>}>Prototype: client view</Chip>}
        dock={false}
        overlay={overlay}
      >
        <h2 className="scalar-visually-hidden">{`${company.name} — Final Report`}</h2>
        {s.final && state !== 'client-empty' ? (
          <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
            <ReportViewer company={company} date={date} version={s.final} notify={setToast} />
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
  const tools = (
    <>
      <Button size="xs" variant="secondary" leadingIcon={<Icon size="s" tone="inherit"><icons.UploadFile /></Icon>} onClick={() => setUploading(true)}>
        Upload report
      </Button>
      <Button size="xs" variant="primary" leadingIcon={<Icon size="s" tone="inherit"><icons.PictureAsPdf /></Icon>} onClick={createExport} disabled={!s.state.hasValuation}>
        Create PDF export
      </Button>
    </>
  );

  return (
    <CompanyLayout
      company={company}
      section="documents"
      date={date}
      headerEnd={<CompanyDocsHeaderEnd companyId={company.id} />}
      subNav={<DocumentsSubNav companyId={company.id} current="final-report" />}
      subNavEnd={tools}
      dock={false}
      overlay={overlay}
    >
      <h2 className="scalar-visually-hidden">{`${company.name} — Final Report`}</h2>
      {s.status === 'out-of-date' && (
        <Banner
          tone="warning"
          title="The final report is out of date"
          action={<Button variant="secondary" size="s" onClick={createExport}>Create new PDF export</Button>}
        >
          {`The valuation changed on ${formatDay(s.state.revision.savedAt)}. ${company.name} still sees v${s.final?.versionNumber} until you set a new final.`}
        </Banner>
      )}

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
                <VersionItem key={v.id} s={s} version={v} selected={v.id === selected?.id} onSelect={() => setSelectedId(v.id)} onSetFinal={() => askFinal(v)} />
              ))}
            </ul>
            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: space.s, paddingTop: space.m, borderTop: `1px solid ${color.stroke.divider}` }}>
              <Text step="s" tone="secondary">Prototype: versions live in this browser. Save a valuation change to see a report go out of date.</Text>
              <div style={{ display: 'flex', gap: space.s, flexWrap: 'wrap' }}>
                <Button size="s" variant="tertiary" onClick={() => { s.saveValuationChange(); setToast('Valuation change saved. What the client sees did not change.'); }}>Save a valuation change</Button>
                <Button size="s" variant="tertiary" onClick={() => { s.reset(); setSelectedId(undefined); }}>Reset prototype data</Button>
              </div>
            </div>
          </section>
          {selected && <ReportViewer key={selected.id} company={company} date={date} version={selected} failed={state === 'render-failed'} notify={setToast} />}
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
