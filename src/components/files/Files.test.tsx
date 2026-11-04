import { createRef, useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { checkA11y } from '../../test/render.js';
import {
  FileTypeBadge, FileTypeIcon, FileRow, TreeItem, PageStepper, ZoomControl, DocumentViewerHeader, ScrollHintPill,
} from './index.js';

const clean = async (c: Element) => expect((await checkA11y(c)).violations).toEqual([]);

describe('FileTypeBadge', () => {
  it('shows the extension, forwards ref/className/data-testid', async () => {
    const ref = createRef<HTMLSpanElement>();
    const { container } = render(<FileTypeBadge ref={ref} file="a.xlsx" className="k" data-testid="b" />);
    expect(ref.current).toBe(screen.getByTestId('b'));
    expect(ref.current).toHaveClass('k');
    expect(ref.current).toHaveTextContent('XLSX');
    await clean(container);
  });
});

describe('FileTypeIcon', () => {
  it('forwards ref/className, picks the kind and is hidden from assistive tech', () => {
    const ref = createRef<HTMLSpanElement>();
    render(<FileTypeIcon ref={ref} file="r.pdf" className="k" />);
    expect(ref.current).toHaveClass('k', 'scalar-file-icon--pdf');
    expect(ref.current).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('FileRow', () => {
  it('forwards ref/className/data-testid and has no axe violations', async () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(
      <FileRow ref={ref} name="r.pdf" className="k" data-testid="row" onOpen={() => {}} onDownload={() => {}} onMenu={() => {}} draggable onMove={() => {}} onCheckedChange={() => {}} />,
    );
    expect(ref.current).toBe(screen.getByTestId('row'));
    expect(ref.current).toHaveClass('k');
    expect(screen.getByRole('button', { name: 'Move r.pdf' })).toBeInTheDocument();
    await clean(container);
  });

  it('checkbox works uncontrolled and reports changes', async () => {
    const onCheckedChange = vi.fn();
    render(<FileRow name="r.pdf" defaultChecked={false} onCheckedChange={onCheckedChange} />);
    const box = screen.getByRole('checkbox', { name: 'Select r.pdf' });
    await userEvent.click(box);
    expect(box).toBeChecked();
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it('inline layout with a type icon: one line, icon instead of badge, no axe violations', async () => {
    const { container } = render(<FileRow name="cap.xlsx" layout="inline" typeIndicator="icon" data-testid="row" meta={[{ label: 'Maria' }]} onOpen={() => {}} onCheckedChange={() => {}} />);
    expect(screen.getByTestId('row')).toHaveClass('scalar-file-row--inline');
    expect(container.querySelector('.scalar-file-icon--sheet')).toBeInTheDocument();
    expect(container.querySelector('.scalar-file-badge')).not.toBeInTheDocument();
    await clean(container);
  });

  it('marks the open file with aria-current', () => {
    render(<FileRow name="r.pdf" selected data-testid="row" />);
    expect(screen.getByTestId('row')).toHaveAttribute('aria-current', 'true');
  });
});

function Tree() {
  const [open, setOpen] = useState(true);
  const [sel, setSel] = useState('');
  return (
    <div role="tree" aria-label="Documents">
      <TreeItem type="folder" expanded={open} onToggle={() => setOpen((o) => !o)} count="3">Alpha</TreeItem>
      {open && <TreeItem type="file" level={1} selected={sel === 'b'} onSelect={() => setSel('b')}>Beta.pdf</TreeItem>}
      {open && <TreeItem type="file" level={1} onSelect={() => setSel('c')}>Gamma.xlsx</TreeItem>}
      <TreeItem type="folder" expanded={false} onToggle={() => {}}>Delta</TreeItem>
    </div>
  );
}

describe('TreeItem', () => {
  it('is axe-clean, forwards ref/className/data-testid', async () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(
      <div role="tree" aria-label="t"><TreeItem ref={ref} type="file" className="k" data-testid="ti">x.pdf</TreeItem></div>,
    );
    expect(ref.current).toBe(screen.getByTestId('ti'));
    expect(ref.current).toHaveClass('k');
    await clean(container);
  });

  it('exposes level, position, set size and explicit aria-selected', () => {
    render(<Tree />);
    const items = screen.getAllByRole('treeitem');
    expect(items[0]).toHaveAttribute('aria-level', '1');
    expect(items[0]).toHaveAttribute('aria-posinset', '1');
    expect(items[0]).toHaveAttribute('aria-setsize', '2');
    expect(items[1]).toHaveAttribute('aria-level', '2');
    expect(items[1]).toHaveAttribute('aria-posinset', '1');
    expect(items[1]).toHaveAttribute('aria-setsize', '2');
    expect(items[2]).toHaveAttribute('aria-posinset', '2');
    expect(items[3]).toHaveAttribute('aria-posinset', '2');
    expect(items[1]).toHaveAttribute('aria-selected', 'false');
  });

  it('has a single tab stop and roves with the arrow keys', async () => {
    const user = userEvent.setup();
    render(<Tree />);
    const items = screen.getAllByRole('treeitem');
    expect(items.filter((i) => i.tabIndex === 0)).toHaveLength(1);
    await user.tab();
    expect(items[0]).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(items[1]).toHaveFocus();
    expect(items[1]!.tabIndex).toBe(0);
    expect(items[0]!.tabIndex).toBe(-1);
    await user.keyboard('{End}');
    expect(items[3]).toHaveFocus();
    await user.keyboard('{Home}');
    expect(items[0]).toHaveFocus();
    await user.keyboard('{ArrowUp}');
    expect(items[0]).toHaveFocus();
  });

  it('Left/Right collapse, expand, enter and leave folders', async () => {
    const user = userEvent.setup();
    render(<Tree />);
    await user.tab();
    await user.keyboard('{ArrowRight}'); // open folder: moves to first child
    expect(screen.getByRole('treeitem', { name: /Beta/ })).toHaveFocus();
    await user.keyboard('{ArrowLeft}'); // child: moves to parent
    expect(screen.getByRole('treeitem', { name: /Alpha/ })).toHaveFocus();
    await user.keyboard('{ArrowLeft}'); // open folder: collapses
    expect(screen.getAllByRole('treeitem')).toHaveLength(2);
    expect(screen.getByRole('treeitem', { name: /Alpha/ })).toHaveAttribute('aria-expanded', 'false');
    await user.keyboard('{ArrowRight}'); // closed folder: expands
    expect(screen.getAllByRole('treeitem')).toHaveLength(4);
  });

  it('type-ahead jumps to a matching label', async () => {
    const user = userEvent.setup();
    render(<Tree />);
    await user.tab();
    await user.keyboard('g');
    expect(screen.getByRole('treeitem', { name: /Gamma/ })).toHaveFocus();
  });

  it('Enter / Space / click activate', async () => {
    const user = userEvent.setup();
    render(<Tree />);
    await user.click(screen.getByRole('treeitem', { name: /Beta/ }));
    expect(screen.getByRole('treeitem', { name: /Beta/ })).toHaveAttribute('aria-selected', 'true');
    screen.getByRole('treeitem', { name: /Gamma/ }).focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('treeitem', { name: /Gamma/ })).toHaveFocus();
    await user.keyboard('{ArrowUp}{ArrowUp}{ }');
    expect(screen.getByRole('treeitem', { name: /Alpha/ })).toHaveAttribute('aria-expanded', 'false');
  });
});

describe('PageStepper', () => {
  function Harness({ onChange = () => {} }: { onChange?: (p: number) => void }) {
    const [p, setP] = useState(3);
    return <PageStepper page={p} total={12} onChange={(n) => { setP(n); onChange(n); }} data-testid="ps" />;
  }
  it('is axe-clean and forwards ref/className/data-testid', async () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(<PageStepper ref={ref} page={1} total={5} onChange={() => {}} className="k" data-testid="ps" />);
    expect(ref.current).toBe(screen.getByTestId('ps'));
    expect(ref.current).toHaveClass('k');
    await clean(container);
  });
  it('steps with the buttons and announces the page', async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(onChange).toHaveBeenCalledWith(4);
    expect(screen.getByRole('status')).toHaveTextContent('Page 4 of 12');
  });
  it('jumps on Enter, keeps focus, clamps, and reverts garbage', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    const input = screen.getByRole('textbox', { name: 'Page number' });
    await user.clear(input);
    await user.type(input, '9{Enter}');
    expect(onChange).toHaveBeenLastCalledWith(9);
    expect(input).toHaveFocus();
    expect(input).toHaveValue('9');
    await user.clear(input);
    await user.type(input, '99{Enter}');
    expect(onChange).toHaveBeenLastCalledWith(12);
    await user.clear(input);
    await user.type(input, 'abc');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    await user.tab();
    expect(input).toHaveValue('12');
  });
  it('commits on blur', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    const input = screen.getByRole('textbox', { name: 'Page number' });
    await user.clear(input);
    await user.type(input, '7');
    await user.tab();
    expect(onChange).toHaveBeenCalledWith(7);
  });
});

describe('ZoomControl', () => {
  it('is axe-clean, forwards ref/className/data-testid, steps through levels', async () => {
    const ref = createRef<HTMLDivElement>();
    const onChange = vi.fn();
    const { container } = render(<ZoomControl ref={ref} value={100} onChange={onChange} onFit={() => {}} className="k" data-testid="z" />);
    expect(ref.current).toBe(screen.getByTestId('z'));
    expect(ref.current).toHaveClass('k');
    await userEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(onChange).toHaveBeenCalledWith(125);
    await userEvent.click(screen.getByRole('button', { name: 'Zoom out' }));
    expect(onChange).toHaveBeenCalledWith(75);
    await clean(container);
  });
});

describe('DocumentViewerHeader', () => {
  it('names the file as a heading, names actions for the file, forwards props', async () => {
    const ref = createRef<HTMLDivElement>();
    const onDownload = vi.fn();
    const { container } = render(
      <DocumentViewerHeader ref={ref} fileName="r.pdf" className="k" data-testid="h" onDownload={onDownload} onDelete={() => {}} onClose={() => {}} />,
    );
    expect(ref.current).toBe(screen.getByTestId('h'));
    expect(ref.current).toHaveClass('k');
    expect(screen.getByRole('heading', { name: 'r.pdf', level: 2 })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Download r.pdf' }));
    expect(onDownload).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Delete r.pdf' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Rename/ })).toBeNull();
    await clean(container);
  });
});

describe('ScrollHintPill', () => {
  it('is a button, forwards ref/className/data-testid and click', async () => {
    const ref = createRef<HTMLButtonElement>();
    const onClick = vi.fn();
    const { container } = render(<ScrollHintPill ref={ref} className="k" data-testid="p" onClick={onClick}>17 companies</ScrollHintPill>);
    expect(ref.current).toBe(screen.getByTestId('p'));
    expect(ref.current).toHaveClass('k');
    await userEvent.click(screen.getByRole('button', { name: '17 companies' }));
    expect(onClick).toHaveBeenCalled();
    await clean(container);
  });
});
