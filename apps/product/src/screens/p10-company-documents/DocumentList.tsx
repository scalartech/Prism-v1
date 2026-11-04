/**
 * Company · Documents — the company's files, laid out like the firm Documents
 * page with this company already selected: measurement-date folders holding
 * the file tree on the left, the document preview on the right. The company's
 * three navigation tiers stay (product menu · company header · Documents /
 * Questions / Requests).
 *
 * Figma: 10 · Company · Documents & Requests → Documents List (3 frames); body
 * from 05 · Documents (Firm) → Company Documents.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Button, ButtonIcon, Checkbox, Dropzone, EmptyState, FileRow, Heading, Icon, Input, Modal, Text, TreeItem, icons, space,
} from '@scalar/design-system';
import type { ScreenProps } from '../../types.js';
import { companyById, user } from '../../data/fixtures.js';
import { CompanyLayout } from '../../shell/CompanyLayout.js';
import { companyDates, rootFiles, subfoldersFor, type DocFile } from '../p05-documents/data.js';
import { DateBand, Viewer, metaChips } from '../p05-documents/parts.js';
import { CompanyActionsButton, DocumentsSubNav, InfoRequestButton, RequestsHeading, requestsText } from './shared.js';
import { requestCounts } from './requestData.js';

const PREVIEW_MS = 1200;
const today = '09/28/2026';

function UploadModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: (files: File[]) => void }) {
  const [files, setFiles] = useState<File[]>([]);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add New Document"
      size="l"
      dismissOnScrimClick={!files.length}
      footer={
        <>
          <Button variant="tertiary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!files.length} onClick={() => { onDone(files); setFiles([]); }}>Done</Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: space.s }}>
        <Dropzone
          multiple
          accept=".csv,.docx,.jpg,.pdf,.xlsx,.zip"
          hint="250 MB max file size. CSV, DOCX, JPG, PDF, XLSX, ZIP format file."
          prompt={(browse) => <>Drag &amp; Drop Supporting Documents or {browse('Select a file')}</>}
          onFiles={(list) => setFiles((f) => [...f, ...list])}
        />
        {files.map((f, i) => (
          <FileRow key={`${f.name}-${i}`} name={f.name} meta={[{ label: `${Math.max(1, Math.round(f.size / 1024))} KB` }]} onMenu={() => setFiles((all) => all.filter((_, j) => j !== i))} />
        ))}
        <Text step="s" tone="tertiary">The document will be added to the currently selected measurement date.</Text>
        <Text step="s" tone="tertiary">The uploaded document will be saved in the documents section.</Text>
      </div>
    </Modal>
  );
}

export function DocumentList({ state, params }: ScreenProps) {
  const company = companyById(params.companyId);
  const dates = [company.asOf, ...companyDates.filter((d) => d !== company.asOf)];
  const [uploaded, setUploaded] = useState<DocFile[]>([]);
  const [uploading, setUploading] = useState(state === 'upload');
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set([company.asOf]));
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [fileId, setFileId] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const timer = useRef<number>();
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const counts = requestCounts(company.id);
  const root = [...uploaded, ...rootFiles];
  const folders = subfoldersFor(company.name);
  const allFiles = [...root, ...folders.flatMap((s) => s.files)];
  const file = allFiles.find((f) => f.id === fileId);
  const matches = (f: DocFile) => f.name.toLowerCase().includes(query.toLowerCase());
  const everyId = allFiles.map((f) => f.id);
  const allChecked = everyId.length > 0 && everyId.every((id) => checked.has(id));

  const toggle = (set: Set<string>, key: string) => { const n = new Set(set); if (n.has(key)) n.delete(key); else n.add(key); return n; };
  const check = (id: string) => (v: boolean) => setChecked((s) => { const n = new Set(s); if (v) n.add(id); else n.delete(id); return n; });
  const openFile = (id: string) => {
    setFileId(id);
    setLoading(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setLoading(false), PREVIEW_MS);
  };

  const fileRow = (f: DocFile, compact: boolean) => (
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
  );

  /** Root files → subfolders, as a tree of rows. Compact (names only) while a preview is open. */
  const tree = (compact: boolean): ReactNode => {
    const shownRoot = root.filter(matches);
    return (
      <div role="tree" aria-label={`${company.name} documents`} style={{ display: 'flex', flexDirection: 'column' }}>
        {shownRoot.map((f) => fileRow(f, compact))}
        {folders.map((folder) => {
          const open = !collapsed.has(folder.id) || !!query;
          const shown = folder.files.filter(matches);
          if (query && !shown.length) return null;
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
              {open && shown.map((f) => <div key={f.id} style={{ paddingLeft: space.xl }}>{fileRow(f, compact)}</div>)}
            </div>
          );
        })}
        {query && !shownRoot.length && folders.every((fo) => !fo.files.some(matches)) && (
          <EmptyState type="no-results" title="No documents match" body="Clear the search to see every document." />
        )}
      </div>
    );
  };

  return (
    <CompanyLayout
      company={company}
      section="documents"
      date={company.asOf}
      headerEnd={<CompanyActionsButton />}
      subNav={<DocumentsSubNav companyId={company.id} current="documents" />}
      subNavEnd={
        <>
          <Checkbox
            size="s"
            checked={allChecked}
            indeterminate={!allChecked && checked.size > 0}
            onChange={(e) => setChecked(e.target.checked ? new Set(everyId) : new Set())}
          >
            Select all documents
          </Checkbox>
          <ButtonIcon variant="tertiary" size="xs" label="Filter documents" icon={<Icon size="s" tone="secondary"><icons.FilterList /></Icon>} />
          <InfoRequestButton companyId={company.id} />
        </>
      }
      dock={false}
      overlay={
        <UploadModal
          open={uploading}
          onClose={() => setUploading(false)}
          onDone={(files) => {
            setUploaded((all) => [
              ...files.map((f, i) => ({ id: `u${all.length + i}`, name: f.name, uploader: user.name, date: today })),
              ...all,
            ]);
            setUploading(false);
          }}
        />
      }
    >
      <RequestsHeading
        companyId={company.id}
        title="Documents"
        menuOpen={state === 'page-menu'}
        counts={{ done: counts.resolved, total: counts.total, label: 'Information requests resolved', text: requestsText(counts) }}
      />

      <div style={{ display: 'flex', gap: space.l, alignItems: 'flex-start' }}>
        <section
          aria-label={`${company.name} measurement dates`}
          style={{ flex: file ? '0 0 32%' : 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: space.s }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: space.m }}>
            <Heading level={2} step="m">All Documents</Heading>
            <div style={{ flex: '0 1 40%', minWidth: 0 }}>
              <Input
                aria-label="Search documents"
                placeholder="Search documents"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                leadingIcon={<Icon size="s" tone="secondary"><icons.Search /></Icon>}
              />
            </div>
          </div>
          {dates.map((d, i) => {
            const open = expandedDates.has(d);
            return (
              <div key={d} style={{ display: 'flex', flexDirection: 'column', gap: space.xs }}>
                <DateBand
                  compact={!!file}
                  date={d}
                  meta={i === 0 ? `${allFiles.length} documents | ${folders.length} subfolders | ${requestsText(counts)}` : undefined}
                  expanded={open}
                  onToggle={() => setExpandedDates((s) => toggle(s, d))}
                  onAddFolder={() => {}}
                  onUpload={() => setUploading(true)}
                />
                {open && (i === 0
                  ? <div style={{ paddingLeft: space.l }}>{tree(!!file)}</div>
                  : <Text step="s" tone="tertiary" style={{ padding: space.s }}>No documents for this measurement date.</Text>)}
              </div>
            );
          })}
        </section>

        {file && <Viewer key={file.id} file={file} loading={loading} onClose={() => setFileId(undefined)} />}
      </div>
    </CompanyLayout>
  );
}
