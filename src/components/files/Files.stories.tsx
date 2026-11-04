import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  fileKindOf, FileTypeBadge, FileTypeIcon, FileRow, TreeItem, TreeGroup, PageStepper, ZoomControl, DocumentViewerHeader, ScrollHintPill,
} from './index.js';
import { Icon } from '../icon/Icon.js';
import { Clock, User } from '../icon/glyphs.js';

/** File lists, the documents tree and the viewer chrome. */
const meta = {
  title: 'Files/Files',
  tags: ['autodocs'],
  decorators: [(Story) => <div style={{ width: 640 }}><Story /></div>],
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const FILES = ['report.pdf', 'model.xlsx', 'memo.docx', 'logo.png', 'notes.txt', 'archive.zip'];

/** Colour identifies the format, never status; the extension text is always shown. `fileKindOf` maps a name to its token family. */
export const BadgeKinds: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 'var(--space-xs)', alignItems: 'center', flexWrap: 'wrap' }}>
      {FILES.map((f) => <span key={f} title={fileKindOf(f)}><FileTypeBadge file={f} /></span>)}
    </div>
  ),
};

const meta2 = [{ icon: <Icon size="xs" tone="inherit"><User /></Icon>, label: 'Maria Lopez' }, { icon: <Icon size="xs" tone="inherit"><Clock /></Icon>, label: 'Oct 6, 2026' }];

export const Row: Story = { render: () => <FileRow name="Q3 board report.pdf" meta={meta2} onOpen={() => {}} /> };
export const RowActions: Story = { render: () => <FileRow name="Q3 board report.pdf" meta={meta2} onOpen={() => {}} onDownload={() => {}} onMenu={() => {}} /> };
/** One line per file with a type icon — dense document trees (Company › Documents). */
export const RowInline: Story = {
  render: () => (
    <div>
      {['Cap table.xlsx', 'Q3 board report.pdf', 'Org chart.png', 'Bylaws.docx', 'Archive.zip'].map((n) => (
        <FileRow key={n} layout="inline" typeIndicator="icon" draggable name={n} meta={meta2} onCheckedChange={() => {}} onOpen={() => {}} />
      ))}
    </div>
  ),
};
export const TypeIcons: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 'var(--space-m)' }}>
      {['a.pdf', 'a.docx', 'a.xlsx', 'a.png', 'a.txt', 'a.zip'].map((f) => <FileTypeIcon key={f} file={f} title={f} />)}
    </div>
  ),
};
export const RowSelectedFile: Story = { render: () => <FileRow selected name="Q3 board report.pdf" meta={meta2} onOpen={() => {}} /> };
/** Dragging is pointer-only on its own; passing `onMove` turns the handle into a "Move" button. */
export const RowDraggable: Story = { render: () => <FileRow draggable onMove={() => {}} name="Cap table.xlsx" meta={meta2} onOpen={() => {}} /> };
export const RowBulkSelect: Story = {
  render: function Render() {
    const [rows, setRows] = useState<Record<string, boolean>>({ 'memo.docx': true });
    return (
      <div>
        {['report.pdf', 'model.xlsx', 'memo.docx'].map((n) => (
          <FileRow key={n} name={n} checked={!!rows[n]} onCheckedChange={(c) => setRows((r) => ({ ...r, [n]: c }))} onOpen={() => {}} />
        ))}
      </div>
    );
  },
};

/**
 * Up/Down move between visible items, Right expands or enters a folder, Left collapses or goes to the parent,
 * Home/End jump to the ends, Enter/Space activate, typing a letter jumps to the next match.
 */
export const Tree: Story = {
  render: function Render() {
    const [open, setOpen] = useState({ date: true, acme: true, sub: false });
    const [sel, setSel] = useState('model.xlsx');
    const flip = (k: keyof typeof open) => setOpen((o) => ({ ...o, [k]: !o[k] }));
    return (
      <div role="tree" aria-label="Documents">
        <TreeItem type="folder" level={0} expanded={open.date} onToggle={() => flip('date')} count={12}>Measurement date 06/30/2026</TreeItem>
        {open.date && (
          <>
            <TreeItem type="folder" level={1} expanded={open.acme} onToggle={() => flip('acme')} count={5}>Acme Holdings</TreeItem>
            {open.acme && (
              <>
                <TreeItem type="folder" level={2} expanded={open.sub} onToggle={() => flip('sub')} count={2}>Board materials</TreeItem>
                {open.sub && <TreeItem type="file" level={3} fileName="deck.pdf">deck.pdf</TreeItem>}
                {['model.xlsx', 'report.pdf'].map((n) => (
                  <TreeItem key={n} type="file" level={2} fileName={n} selected={sel === n} onSelect={() => setSel(n)}>{n}</TreeItem>
                ))}
              </>
            )}
          </>
        )}
      </div>
    );
  },
};

/** When children are nested in the DOM, wrap them in `TreeGroup` (`role="group"`). */
export const TreeNested: Story = {
  render: () => (
    <div role="tree" aria-label="Folders">
      <TreeItem type="folder" level={0} expanded count={2}>Contracts</TreeItem>
      <TreeGroup>
        <TreeItem type="file" level={1} fileName="nda.pdf">nda.pdf</TreeItem>
        <TreeItem type="file" level={1} fileName="terms.docx">terms.docx</TreeItem>
      </TreeGroup>
    </div>
  ),
};

/** Type a number and press Enter to jump (out-of-range clamps, Esc reverts). Previous / Next are buttons. */
export const Stepper: Story = {
  render: function Render() {
    const [p, setP] = useState(3);
    return <PageStepper page={p} total={24} onChange={setP} />;
  },
};
export const StepperFirstPage: Story = { render: () => <PageStepper page={1} total={24} onChange={() => {}} /> };

export const Zoom: Story = {
  render: function Render() {
    const [z, setZ] = useState(100);
    return <ZoomControl value={z} onChange={setZ} onFit={() => setZ(100)} />;
  },
};
export const ZoomAtMax: Story = { render: () => <ZoomControl value={200} onChange={() => {}} /> };

export const ViewerHeader: Story = {
  render: () => (
    <DocumentViewerHeader
      fileName="Q3 board report.pdf"
      meta="Uploaded by Maria Lopez · Oct 6, 2026"
      onDownload={() => {}} onCopyLink={() => {}} onRename={() => {}} onDelete={() => {}} onExpand={() => {}} onClose={() => {}}
    />
  ),
};
export const ViewerHeaderMinimal: Story = { render: () => <DocumentViewerHeader fileName="model.xlsx" onClose={() => {}} /> };

export const ScrollHints: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 'var(--space-s)' }}>
      <ScrollHintPill>17 companies</ScrollHintPill>
      <ScrollHintPill direction="up">Back to top</ScrollHintPill>
    </div>
  ),
};
