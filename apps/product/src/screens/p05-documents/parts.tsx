/**
 * Pieces of the Documents layout shared by the firm Documents page and
 * Company · Documents: the measurement-date band, file meta chips and the
 * document preview.
 */
import { useState, type ReactNode } from 'react';
import {
  Button, ButtonIcon, CheckboxItem, Chip, DocumentViewerHeader, EmptyState, FilterDropdown, Heading, Icon, Input,
  PageStepper, ScrollHintPill, Spinner, TertiaryMenuItem, Text, ZoomControl, color, elevation, icons, radius, space,
} from '@scalar/design-system';
import { href } from '../../router.js';
import { routes } from '../../routes.js';
import { VISIBLE_COMPANIES, docCompanies, type DocCompany, type DocFile } from './data.js';

/* --- firm Documents chrome: Tier 3 tabs and the All Companies column ------- */

export type FirmDocsTab = 'documents' | 'questions' | 'requests';

/**
 * Firm Documents' Tier 3: Documents · Questions · Requests (the same three as
 * Company › Documents). Questions and Requests keep the selected company.
 */
export function FirmDocsTabs({ current, companyId }: { current: FirmDocsTab; companyId?: string }) {
  const f = routes.firmDocuments;
  return (
    <>
      <TertiaryMenuItem current={current === 'documents'} menu={false} href={href(routes.documents)}>Documents</TertiaryMenuItem>
      <TertiaryMenuItem current={current === 'questions'} menu={false} href={href(companyId ? f.companyQuestions(companyId) : f.questions)}>Questions</TertiaryMenuItem>
      <TertiaryMenuItem current={current === 'requests'} menu={false} href={href(companyId ? f.companyRequests(companyId) : f.requests)}>Requests</TertiaryMenuItem>
    </>
  );
}

/** One company in the left list: name, fund tag and what the tab counts for it. */
export function CompanyRow({ name, fund, end, selected, onClick }: {
  name: string; fund?: string; end: ReactNode; selected: boolean; onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: space.s, width: '100%',
        padding: `${space.s} ${space.m}`, borderRadius: radius.xs, cursor: 'pointer', textAlign: 'left',
        background: selected ? color.bg.brandSubtle : color.bg.surface,
        border: `1px solid ${selected ? color.stroke.brand : color.stroke.control}`,
      }}
    >
      <Text step="m" tone={selected ? 'brand' : 'primary'} truncate style={{ flex: 1 }}>{name}</Text>
      {fund && <Chip styleVariant="default">{fund}</Chip>}
      {end}
    </button>
  );
}

/** The All Companies column: find a company, pick it. `end` is the tab's count for each one. */
export function CompanyColumn({ selectedId, onSelect, end }: {
  selectedId?: string;
  onSelect: (id: string) => void;
  end: (c: DocCompany) => ReactNode;
}) {
  const [query, setQuery] = useState('');
  const shown = docCompanies(query);
  return (
    <section aria-label="All Companies" style={{ flex: '0 0 22%', minWidth: 0, display: 'flex', flexDirection: 'column', gap: space.s }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Heading level={2} step="m">All Companies</Heading>
        <FilterDropdown>All funds</FilterDropdown>
      </div>
      <Input
        aria-label="Find company"
        placeholder="Find Company"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        leadingIcon={<Icon size="s" tone="secondary"><icons.Search /></Icon>}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: space.xs, maxHeight: '70vh', overflow: 'auto', position: 'relative' }}>
        {shown.map((c) => (
          <CompanyRow key={c.id} name={c.name} fund={c.fund} end={end(c)} selected={c.id === selectedId} onClick={() => onSelect(c.id)} />
        ))}
        {shown.length > VISIBLE_COMPANIES && (
          <div style={{ position: 'sticky', bottom: 0, display: 'flex', justifyContent: 'center', padding: space.xs }}>
            <ScrollHintPill>{shown.length - VISIBLE_COMPANIES} companies</ScrollHintPill>
          </div>
        )}
        {!shown.length && <EmptyState type="no-results" title="No companies match" body="Clear the search to see every company." />}
      </div>
    </section>
  );
}

/* --- small composed pieces (no DS equivalent) ------------------------------ */

export function metaChips(file: DocFile, withLink = true) {
  return [
    { icon: <Icon size="xs" tone="inherit"><icons.Person /></Icon>, label: file.uploader },
    { icon: <Icon size="xs" tone="inherit"><icons.CalendarToday /></Icon>, label: file.date },
    ...(withLink && file.link ? [{ icon: <Icon size="xs" tone="inherit"><icons.Link /></Icon>, label: file.link }] : []),
  ];
}

/** A measurement-date folder band: select, name, counts, folder actions, collapse. */
export function DateBand({ date, meta, expanded, onToggle, compact, onAddFolder, onUpload }: {
  date: string; meta?: string; expanded: boolean; onToggle: () => void; compact?: boolean;
  onAddFolder: () => void; onUpload: () => void;
}) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: space.s, padding: `${space.xs} ${space.m}`,
        background: color.bg.subtle, border: `1px solid ${color.stroke.subtle}`, borderRadius: radius.xs,
      }}
    >
      <CheckboxItem size="s" aria-label={`Select ${date}`} />
      <Icon size="s" tone="secondary"><icons.Folder /></Icon>
      <Text step="m" weight="semiBold">{date}</Text>
      {meta && <Text step="s" tone="tertiary" truncate style={{ flex: 1 }}>{meta}</Text>}
      <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: space.xs }}>
        {compact ? (
          <>
            <ButtonIcon variant="tertiary" size="s" label={`Add subfolder to ${date}`} onClick={onAddFolder} icon={<Icon size="s" tone="inherit"><icons.CreateNewFolder /></Icon>} />
            <ButtonIcon variant="tertiary" size="s" label={`Upload document to ${date}`} onClick={onUpload} icon={<Icon size="s" tone="inherit"><icons.UploadFile /></Icon>} />
          </>
        ) : (
          <>
            <Button variant="tertiary" size="s" leadingIcon={<Icon size="s" tone="inherit"><icons.CreateNewFolder /></Icon>} onClick={onAddFolder}>Add Subfolder</Button>
            <Button variant="tertiary" size="s" leadingIcon={<Icon size="s" tone="inherit"><icons.UploadFile /></Icon>} onClick={onUpload}>Upload Document</Button>
          </>
        )}
        <ButtonIcon
          variant="tertiary" size="s" label={expanded ? `Collapse ${date}` : `Expand ${date}`} onClick={onToggle}
          icon={<Icon size="s" tone="inherit">{expanded ? <icons.KeyboardArrowUp /> : <icons.KeyboardArrowDown />}</Icon>}
        />
      </span>
    </div>
  );
}

/* --- viewer ---------------------------------------------------------------- */

export function Viewer({ file, loading, onClose }: { file: DocFile; loading: boolean; onClose: () => void }) {
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  return (
    <section aria-label="Document preview" style={{ display: 'flex', flexDirection: 'column', gap: space.s, flex: 1, minWidth: 0 }}>
      <DocumentViewerHeader
        fileName={file.name}
        meta={
          <span style={{ display: 'inline-flex', gap: space.xs }}>
            <Chip styleVariant="default">{file.uploader}</Chip>
            <Chip styleVariant="default">{file.date}</Chip>
          </span>
        }
        onDownload={() => {}}
        onCopyLink={() => {}}
        onRename={() => {}}
        onDelete={() => {}}
        onExpand={() => {}}
        onClose={onClose}
      />
      <div
        style={{
          flex: 1, display: 'flex', flexDirection: 'column', gap: space.m, padding: space.m,
          background: color.bg.subtle, border: `1px solid ${color.stroke.subtle}`, borderRadius: radius.s,
        }}
      >
        {loading ? (
          <div role="status" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: space.s, padding: space['4xl'] }}>
            <Spinner size="l" label="Preparing PDF preview" />
            <Text step="m" tone="secondary">Preparing PDF preview…</Text>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <PageStepper page={page} total={12} onChange={setPage} />
              <ZoomControl value={zoom} onChange={setZoom} onFit={() => setZoom(100)} />
            </div>
            <article
              aria-label={`Page ${page} of 12`}
              style={{
                display: 'flex', flexDirection: 'column', gap: space.l, padding: space['2xl'],
                background: color.bg.surface, border: `1px solid ${color.stroke.default}`,
                borderRadius: radius.xs, boxShadow: elevation.raised,
              }}
            >
              <Heading level={2} step="3xl">Django</Heading>
              <Text step="l" tone="secondary">Documentation</Text>
              <Heading level={3} step="2xl" weight="regular">Advanced testing topics</Heading>
              <Heading level={4} step="l" weight="regular">The request factory</Heading>
              <Text step="m">
                Preview of page {page}. The rendered PDF appears here at {zoom}% — use the page stepper to move
                through the document and the zoom control to fit it to the pane.
              </Text>
              <Text step="m" tone="secondary">
                The document stays linked to its company and measurement date, so it also appears in the company’s
                Documents tab and in the Workspace drawer on its Waterfall and Valuations pages.
              </Text>
            </article>
          </>
        )}
      </div>
    </section>
  );
}

