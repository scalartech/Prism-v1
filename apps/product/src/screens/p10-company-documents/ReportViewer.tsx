/**
 * The final-report viewer, shared by the company Final Report tab and the firm
 * Reports page (Round 2 §3, §4). The pane holds only the report: file name,
 * provenance and date, the page stepper, and the pages. View (zoom) and File
 * (Download · Print) live in the page's tertiary row — `ReportTools` — and act
 * on the version shown here.
 *
 * The prototype has no PDF, so the pages are drawn: each page has its own
 * section, zoom scales the page, Fit returns it to the pane's width.
 */
import { useEffect, useState, type ReactNode } from 'react';
import {
  Alert, Button, ButtonIcon, ContextMenu, Divider, FilterDropdown, Heading, Icon, MenuItem, PageStepper, SelectMenu,
  SelectMenuOption, Text, ZoomControl, color, elevation, icons, radius, size, space, zIndex,
} from '@scalar/design-system';
import type { Company } from '../../data/fixtures.js';
import { columnPanel } from '../p05-documents/parts.js';
import { formatStamp } from './exportsData.js';
import type { ReportVersion } from './finalReportData.js';
import { useNarrow } from './shared.js';

export const REPORT_PAGES = [
  'Summary of conclusions', 'Engagement and scope', 'Company overview', 'Industry and market', 'Financial performance',
  'Valuation approach', 'Income approach', 'Market approach — guideline companies', 'Market approach — transactions',
  'Capital structure', 'Allocation of equity value', 'Option pricing method', 'Discount for lack of marketability',
  'Reconciliation of approaches', 'Conclusion of value', 'Assumptions and limiting conditions', 'Appraiser certification',
  'Appendix — data sources',
] as const;

/** Prototype: there is no file, so a download only says what it would do. */
export const downloadNote = (v: ReportVersion) => `${v.fileName} downloaded. The prototype produces no file.`;

/** [Scalar icon] Prepared by Scalar, or [person] Uploaded by …. The words carry the meaning; the icon only marks it. */
export function Provenance({ version }: { version: ReportVersion }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: space.xs }}>
      {version.source === 'scalar_export'
        ? <img src="./assets/scalar-icon-navy.png" alt="Scalar" style={{ width: size.icon.s, height: size.icon.s }} />
        : <Icon size="s" tone="secondary"><icons.Person /></Icon>}
      <Text as="span" step="s" tone="secondary">{version.source === 'scalar_export' ? 'Prepared by Scalar' : `Uploaded by ${version.createdBy}`}</Text>
    </span>
  );
}

export function ReportViewer({ company, date, version, zoom, failed, onDownload, headerEnd }: {
  company: Company;
  date: string;
  version: ReportVersion;
  /** Percent, from the tertiary row's zoom. */
  zoom: number;
  failed?: boolean;
  onDownload: () => void;
  /** After the provenance line: "Open in company" on the firm page. */
  headerEnd?: ReactNode;
}) {
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [version.id]);
  const total = REPORT_PAGES.length;
  return (
    <section aria-label={`Report preview: ${version.fileName}`} style={{ ...columnPanel, flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: space.s }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: space.m, flexWrap: 'wrap' }}>
        <Icon size="m" tone="negative"><icons.PictureAsPdf /></Icon>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: space['2xs'] }}>
          <Heading level={2} step="m" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{version.fileName}</Heading>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: space.xs, flexWrap: 'wrap' }}>
            <Provenance version={version} />
            <Text as="span" step="s" tone="secondary">{`· ${formatStamp(version.createdAt)}`}</Text>
            {version.originalName && <Text as="span" step="s" tone="tertiary">{`· ${version.originalName}`}</Text>}
          </span>
        </div>
        {headerEnd}
      </div>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: space.m, padding: space.m, background: color.bg.subtle, border: `1px solid ${color.stroke.subtle}`, borderRadius: radius.s, overflow: 'auto' }}>
        {failed ? (
          // Never a blank frame: if the PDF can't render, the file is still one click away.
          <Alert tone="warning" title="This report can’t be shown here">
            <span style={{ display: 'flex', flexDirection: 'column', gap: space.s, alignItems: 'flex-start' }}>
              The PDF could not be rendered in the browser. Download it to read it.
              <Button variant="secondary" size="s" leadingIcon={<Icon size="s" tone="inherit"><icons.Download /></Icon>} onClick={onDownload}>
                {`Download ${version.fileName}`}
              </Button>
            </span>
          </Alert>
        ) : (
          <>
            {/* The stepper belongs to the document, so it stays with it. */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <PageStepper page={page} total={total} onChange={setPage} />
            </div>
            <article
              aria-label={`Page ${page} of ${total}`}
              style={{
                width: `${zoom}%`, minWidth: `${zoom}%`, alignSelf: zoom > 100 ? 'flex-start' : 'center', boxSizing: 'border-box',
                display: 'flex', flexDirection: 'column', gap: space.l, padding: space['2xl'],
                background: color.bg.surface, border: `1px solid ${color.stroke.default}`, borderRadius: radius.xs, boxShadow: elevation.raised,
              }}
            >
              <span style={{ display: 'flex', justifyContent: 'space-between', gap: space.m }}>
                <Provenance version={version} />
                <Text as="span" step="s" tone="tertiary">{`${page} / ${total}`}</Text>
              </span>
              {page === 1 && (
                <>
                  <Heading level={3} step="3xl">{company.name}</Heading>
                  <Text step="l" tone="secondary">{`Valuation report · Measurement date ${date}`}</Text>
                </>
              )}
              <Heading level={4} step="l" weight="regular">{`${page}. ${REPORT_PAGES[page - 1]}`}</Heading>
              <Text step="m">
                {page === 1
                  ? `This report sets out the fair value of ${company.name} as of ${date}, the methods used to reach it and the assumptions behind it.`
                  : `Section ${page} of the report: ${REPORT_PAGES[page - 1]!.toLowerCase()} for ${company.name}.`}
              </Text>
              <Text step="m" tone="secondary">
                Figures in this report are the ones in the valuation when the PDF was made. Later changes to the valuation do not change this file.
              </Text>
            </article>
          </>
        )}
      </div>
    </section>
  );
}

const ZOOM_STEPS = [50, 75, 100, 125, 150, 200] as const;

/**
 * The report's tools for the tertiary row: View (zoom) | File (Download ·
 * Print) | Manage (passed in, analysts only; its primary button last). Below
 * 1440px View folds to a "100% ▾" menu; below 1280px Download and Print move
 * into ⋮.
 */
export function ReportTools({ zoom, onZoom, onDownload, disabled, manage }: {
  zoom: number;
  onZoom: (z: number) => void;
  onDownload: () => void;
  /** Nothing to act on (no report shown). */
  disabled?: boolean;
  manage?: ReactNode;
}) {
  const narrow = useNarrow(1440);
  const narrower = useNarrow(1280);
  const [zoomMenu, setZoomMenu] = useState(false);
  const [fileMenu, setFileMenu] = useState(false);
  const print = () => window.print();
  const divider = <Divider orientation="vertical" style={{ alignSelf: 'stretch' }} />;

  const view = narrow ? (
    <div style={{ position: 'relative' }}>
      <FilterDropdown label="Zoom" expanded={zoomMenu} aria-haspopup="listbox" disabled={disabled} onClick={() => setZoomMenu((o) => !o)}>{`${zoom}%`}</FilterDropdown>
      {zoomMenu && (
        <div style={{ position: 'absolute', top: '100%', right: 0, zIndex: zIndex.overlay, marginTop: space.xs }}>
          <SelectMenu label="Zoom" onEscape={() => setZoomMenu(false)}>
            {ZOOM_STEPS.map((z) => (
              <SelectMenuOption key={z} selected={z === zoom} onSelect={() => { onZoom(z); setZoomMenu(false); }}>{z === 100 ? '100% · Fit' : `${z}%`}</SelectMenuOption>
            ))}
          </SelectMenu>
        </div>
      )}
    </div>
  ) : (
    <ZoomControl value={zoom} onChange={onZoom} onFit={() => onZoom(100)} steps={ZOOM_STEPS} aria-disabled={disabled || undefined} />
  );

  const file = narrower ? (
    <div style={{ position: 'relative' }}>
      <ButtonIcon variant="tertiary" size="xs" label="More report actions" disabled={disabled} aria-haspopup="menu" aria-expanded={fileMenu}
        onClick={() => setFileMenu((o) => !o)} icon={<Icon size="s" tone="inherit"><icons.MoreVert /></Icon>} />
      {fileMenu && (
        <div style={{ position: 'absolute', top: '100%', right: 0, zIndex: zIndex.overlay, marginTop: space.xs, boxShadow: elevation.overlay }}>
          {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
          <ContextMenu label="Report actions" autoFocus onClose={() => setFileMenu(false)}>
            <MenuItem icon={<Icon size="s" tone="inherit"><icons.Download /></Icon>} onClick={() => { onDownload(); setFileMenu(false); }}>Download</MenuItem>
            <MenuItem icon={<Icon size="s" tone="inherit"><icons.Print /></Icon>} onClick={() => { print(); setFileMenu(false); }}>Print</MenuItem>
          </ContextMenu>
        </div>
      )}
    </div>
  ) : (
    <>
      <Button size="xs" variant="tertiary" disabled={disabled} leadingIcon={<Icon size="s" tone="inherit"><icons.Download /></Icon>} onClick={onDownload}>Download</Button>
      <ButtonIcon variant="tertiary" size="xs" label="Print report" disabled={disabled} onClick={print} icon={<Icon size="s" tone="inherit"><icons.Print /></Icon>} />
    </>
  );

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: space.s }}>
      {view}
      {divider}
      {file}
      {manage && <>{divider}{manage}</>}
    </span>
  );
}
