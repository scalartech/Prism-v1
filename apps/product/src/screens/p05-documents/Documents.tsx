/**
 * Documents (firm) — every document the firm holds, by measurement date and
 * company. With no company chosen it lists all measurement-date folders;
 * choosing a company narrows to that company's tree and opens a document
 * preview beside it.
 *
 * Figma: 05 · Documents (Firm) → All Documents · Company Documents · Viewer & Add Folder (5 frames).
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Badge, Button, ButtonIcon, Checkbox, Chip, ComboboxPanel, EmptyState, FileRow, FilterDropdown, FormField, Heading, Icon, Input, Link, Modal, ScrollHintPill, TertiaryMenu, TertiaryMenuItem, Text, TreeItem, color, icons, radius, space,
} from '@scalar/design-system';
import type { ScreenProps } from '../../types.js';
import { href, navigate } from '../../router.js';
import { routes } from '../../routes.js';
import { AppFrame, scrollBody } from '../../shell/AppFrame.js';
import { PageHeader } from '../../shell/PageHeader.js';
import { ToolbarKebab } from '../../shell/Toolbar.js';
import { useDismiss } from '../p04-waterfalls/useDismiss.js';
import {
  VISIBLE_COMPANIES, allFilesFor, companyDates, docCompanies, measurementDates, rootFiles, subfoldersFor,
  type DocFolder,
} from './data.js';
import { DateBand, Viewer, metaChips } from './parts.js';

const PREVIEW_MS = 1200;
/** The company drawn open in the frames (All Documents → 03/31/2025, and the company-selected states). */
const FRAME_COMPANY = 'backside-blocks';

/** One company in the left list: name, fund tag and document count. */
function CompanyRow({ name, fund, count, selected, onClick }: {
  name: string; fund?: string; count: number; selected: boolean; onClick: () => void;
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
      <Badge>{count}</Badge>
    </button>
  );
}

/* --- Add Folder modal ------------------------------------------------------ */

function AddFolderModal({ open, target, folders, pickerInitiallyOpen, onClose, onCreate }: {
  open: boolean; target: string; folders: DocFolder[]; pickerInitiallyOpen: boolean;
  onClose: () => void; onCreate: (name: string, parent: string | undefined) => void;
}) {
  const [name, setName] = useState('');
  const [parent, setParent] = useState<string | undefined>();
  const [pickerOpen, setPickerOpen] = useState(pickerInitiallyOpen);
  const [query, setQuery] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);
  const closePicker = useCallback(() => setPickerOpen(false), []);
  useDismiss(panelRef, pickerOpen, closePicker);

  const options = [{ value: '', label: 'No Folder' }, ...folders.map((f) => ({ value: f.id, label: f.name }))]
    .filter((o) => o.label.toLowerCase().includes(query.toLowerCase()));
  const parentLabel = folders.find((f) => f.id === parent)?.name ?? 'No Folder';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add Folder"
      dismissOnScrimClick={!name}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!name.trim()} onClick={() => onCreate(name.trim(), parent)}>Create Folder</Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: space.l }}>
        <Text step="m" tone="secondary">
          Create a folder {parent ? 'inside' : 'at the top level of'} <Text as="strong" step="m" weight="semiBold">{parent ? parentLabel : target}</Text>.
        </Text>
        <div style={{ position: 'relative' }} data-popover-trigger="">
          <FormField label="Parent Folder">
            <Input
              readOnly
              value={parentLabel}
              aria-haspopup="listbox"
              aria-expanded={pickerOpen}
              onClick={() => setPickerOpen((o) => !o)}
              trailingIcon={<Icon size="s" tone="secondary"><icons.KeyboardArrowDown /></Icon>}
            />
          </FormField>
          {/* In flow, not absolute: the modal body clips overflow, so the panel pushes the form down instead. */}
          {pickerOpen && (
            <div ref={panelRef} style={{ paddingTop: space.xs }}>
              <ComboboxPanel
                autoFocus
                label="Parent folder"
                searchPlaceholder="Find a Folder"
                items={options}
                value={parent ?? ''}
                query={query}
                onQueryChange={setQuery}
                onSelect={(v) => { setParent(v || undefined); setPickerOpen(false); setQuery(''); }}
              />
            </div>
          )}
        </div>
        <FormField label="Folder Name">
          <Input
            autoFocus={!pickerInitiallyOpen}
            placeholder="Enter folder name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) onCreate(name.trim(), parent); }}
          />
        </FormField>
      </div>
    </Modal>
  );
}

/* --- the screen ------------------------------------------------------------ */

export function Documents({ state }: ScreenProps) {
  const companyMode = state !== 'default';
  const [companyId, setCompanyId] = useState<string | undefined>(companyMode ? FRAME_COMPANY : undefined);
  const [fileId, setFileId] = useState<string | undefined>(companyMode ? 'd2' : undefined);
  const [loading, setLoading] = useState(state === 'pdf-loading');
  const [modalOpen, setModalOpen] = useState(state === 'add-folder' || state === 'parent-folder-picker');
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set(['03/31/2025']));
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [modalTarget, setModalTarget] = useState('');
  const [extraFolders, setExtraFolders] = useState<DocFolder[]>([]);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const timer = useRef<number>();

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const listed = docCompanies();
  const company = listed.find((c) => c.id === companyId);
  const treeCompany = company ?? listed.find((c) => c.id === FRAME_COMPANY)!;
  const folders = [...subfoldersFor(treeCompany.name), ...extraFolders];
  const allFiles = allFilesFor(treeCompany.name);
  const file = allFiles.find((f) => f.id === fileId);
  const shownCompanies = query ? docCompanies(query) : listed;

  const openFile = (id: string) => {
    if (!companyId) setCompanyId(FRAME_COMPANY);
    setFileId(id);
    setLoading(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setLoading(false), PREVIEW_MS);
  };
  const toggle = (set: Set<string>, key: string) => { const n = new Set(set); if (n.has(key)) n.delete(key); else n.add(key); return n; };
  const check = (id: string) => (v: boolean) => setChecked((s) => { const n = new Set(s); if (v) n.add(id); else n.delete(id); return n; });
  const addFolder = (target: string) => { setModalTarget(target); setModalOpen(true); };
  const upload = () => navigate(routes.company.documents(companyId ?? FRAME_COMPANY), 'upload');

  /** Company → root files → subfolders, as a tree of rows. */
  const tree = (compact: boolean): ReactNode => (
    <div role="tree" aria-label={`${treeCompany.name} documents`} style={{ display: 'flex', flexDirection: 'column' }}>
      {rootFiles.map((f) => (
        <FileRow
          key={f.id}
          name={f.name}
          meta={compact ? undefined : metaChips(f)}
          draggable
          checked={checked.has(f.id)}
          onCheckedChange={check(f.id)}
          selected={f.id === fileId}
          onOpen={() => openFile(f.id)}
        />
      ))}
      {folders.map((folder) => {
        const open = !collapsed.has(folder.id);
        return (
          <div key={folder.id}>
            <TreeItem
              type="folder"
              level={1}
              expanded={open}
              count={folder.files.length || undefined}
              onToggle={() => setCollapsed((s) => toggle(s, folder.id))}
            >
              {folder.name}
            </TreeItem>
            {open && folder.files.map((f) => (
              <div key={f.id} style={{ paddingLeft: space.xl }}>
                <FileRow
                  name={f.name}
                  meta={compact ? undefined : metaChips(f)}
                  draggable
                  checked={checked.has(f.id)}
                  onCheckedChange={check(f.id)}
                  selected={f.id === fileId}
                  onOpen={() => openFile(f.id)}
                />
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );

  const everyId = allFiles.map((f) => f.id);
  const allChecked = everyId.every((id) => checked.has(id));

  return (
    <AppFrame
      area="documents"
      date="03/31/2025"
      overlay={
        modalOpen && (
          <AddFolderModal
            open
            target={modalTarget || treeCompany.name}
            folders={folders}
            pickerInitiallyOpen={state === 'parent-folder-picker'}
            onClose={() => setModalOpen(false)}
            onCreate={(name) => {
              setExtraFolders((fs) => [...fs, { id: `new-${fs.length}`, name, files: [] }]);
              setModalOpen(false);
            }}
          />
        )
      }
    >
      <PageHeader
        title="Documents"
        trailing={<ToolbarKebab />}
        actions={
          <>
            <Button variant="secondary" size="xs" leadingIcon={<Icon size="s" tone="inherit"><icons.Description /></Icon>}>Request Document</Button>
            <Button variant="primary" size="xs" leadingIcon={<Icon size="s" tone="inherit"><icons.UploadFile /></Icon>}>Upload Document</Button>
            <Button variant="primary" tone="positive" size="xs">Request Information</Button>
          </>
        }
      />
      <TertiaryMenu
        end={
          <>
            <Checkbox
              size="s"
              checked={allChecked}
              indeterminate={!allChecked && checked.size > 0}
              onChange={(e) => setChecked(e.target.checked ? new Set(everyId) : new Set())}
            >
              Select all documents
            </Checkbox>
            <ButtonIcon variant="tertiary" size="xs" label="Search documents" icon={<Icon size="s" tone="secondary"><icons.Search /></Icon>} />
            <ButtonIcon variant="tertiary" size="xs" label="Filter documents" icon={<Icon size="s" tone="secondary"><icons.FilterList /></Icon>} />
            <ButtonIcon variant="tertiary" size="xs" label="Full screen" icon={<Icon size="s" tone="secondary"><icons.Fullscreen /></Icon>} />
          </>
        }
      >
        <TertiaryMenuItem current={!company} menu={false} onClick={() => { setCompanyId(undefined); setFileId(undefined); }}>All Documents</TertiaryMenuItem>
        {company && <TertiaryMenuItem current menu={false}>{company.name}</TertiaryMenuItem>}
      </TertiaryMenu>

      <main style={{ ...scrollBody, display: 'flex', gap: space.l, padding: space.l, alignItems: 'flex-start' }}>
        {/* Companies */}
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
            {shownCompanies.map((c) => (
              <CompanyRow
                key={c.id}
                name={c.name}
                fund={c.fund}
                count={c.count}
                selected={c.id === companyId}
                onClick={() => { setCompanyId(c.id); setFileId(undefined); setLoading(false); }}
              />
            ))}
            {shownCompanies.length > VISIBLE_COMPANIES && (
              <div style={{ position: 'sticky', bottom: 0, display: 'flex', justifyContent: 'center', padding: space.xs }}>
                <ScrollHintPill>{shownCompanies.length - VISIBLE_COMPANIES} companies</ScrollHintPill>
              </div>
            )}
            {!shownCompanies.length && <EmptyState type="no-results" title="No companies match" body="Clear the search to see every company." />}
          </div>
        </section>

        {!company ? (
          /* All Documents — every measurement date */
          <section aria-label="All Documents" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: space.s }}>
            <Heading level={2} step="m">All Documents</Heading>
            {measurementDates.map((m) => {
              const open = expandedDates.has(m.date);
              return (
                <div key={m.date} style={{ display: 'flex', flexDirection: 'column', gap: space.xs }}>
                  <DateBand
                    date={m.date}
                    meta={`${m.documents} documents | ${m.subfolders} subfolders | Requests: ${m.requests.sent} sent, ${m.requests.uploaded} uploaded, ${m.requests.pending} pending`}
                    expanded={open}
                    onToggle={() => setExpandedDates((s) => toggle(s, m.date))}
                    onAddFolder={() => addFolder(m.date)}
                    onUpload={upload}
                  />
                  {open && (
                    <div style={{ paddingLeft: space.l }}>
                      <TreeItem type="folder" icon={<icons.Domain />} expanded onToggle={() => setExpandedDates((s) => toggle(s, m.date))} onSelect={() => setCompanyId(treeCompany.id)} count={treeCompany.count}>
                        {treeCompany.name}
                      </TreeItem>
                      <div style={{ paddingLeft: space.l }}>{tree(false)}</div>
                    </div>
                  )}
                </div>
              );
            })}
            <div style={{ position: 'sticky', bottom: space.m, display: 'flex', justifyContent: 'center' }}>
              <ScrollHintPill>{measurementDates.length} measurement dates</ScrollHintPill>
            </div>
          </section>
        ) : (
          <>
            {/* One company's tree */}
            <section aria-label={`${company.name} documents`} style={{ flex: '0 0 24%', minWidth: 0, display: 'flex', flexDirection: 'column', gap: space.s }}>
              <Heading level={2} step="m">{company.name}</Heading>
              {companyDates.map((d, i) => {
                const open = expandedDates.has(d);
                return (
                  <div key={d} style={{ display: 'flex', flexDirection: 'column', gap: space.xs }}>
                    <DateBand
                      compact
                      date={d}
                      expanded={open}
                      onToggle={() => setExpandedDates((s) => toggle(s, d))}
                      onAddFolder={() => addFolder(company.name)}
                      onUpload={upload}
                    />
                    {open && (i === 0 && company.count > 0
                      ? tree(true)
                      : <Text step="s" tone="tertiary" style={{ padding: space.s }}>No documents for this measurement date.</Text>)}
                  </div>
                );
              })}
            </section>

            {file ? (
              <Viewer key={file.id} file={file} loading={loading} onClose={() => setFileId(undefined)} />
            ) : (
              <section style={{ flex: 1 }}>
                <EmptyState
                  title="Select a document to preview"
                  body={`Pick a file from ${company.name}’s folders to open it here.`}
                  icon={<Icon size="xl" tone="secondary"><icons.Description /></Icon>}
                  actions={<Link href={href(routes.company.documents(company.id))}>Open {company.name} documents</Link>}
                />
              </section>
            )}
          </>
        )}
      </main>
    </AppFrame>
  );
}

