import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRef } from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { checkA11y, renderWithProvider } from '../../test/render.js';
import { Alert, ProgressBar, Skeleton, SkeletonGroup, Toast, ToastViewport } from './index.js';

const clean = async (c: Element) => expect((await checkA11y(c)).violations).toEqual([]);

describe('Alert', () => {
  it('passes axe, forwards ref/className/data-testid, native style works', async () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = renderWithProvider(
      <Alert ref={ref} tone="positive" title="Done" className="x" data-testid="a" style={{ opacity: 0.5 }}>Saved</Alert>,
    );
    await clean(container);
    expect(ref.current).toBe(screen.getByTestId('a'));
    expect(ref.current).toHaveClass('scalar-alert', 'scalar-alert--positive', 'x');
    expect(ref.current).toHaveStyle({ opacity: '0.5' });
    expect(ref.current).toHaveAttribute('role', 'status');
  });
  it('legacy string `style` still sets the tone; negative is role=alert', () => {
    renderWithProvider(<Alert style="negative" data-testid="a">Bad</Alert>);
    expect(screen.getByTestId('a')).toHaveClass('scalar-alert--negative');
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
  it('dismiss button is labelled and works with the keyboard', async () => {
    const onDismiss = vi.fn();
    renderWithProvider(<Alert onDismiss={onDismiss}>x</Alert>);
    const btn = screen.getByRole('button', { name: 'Dismiss' });
    btn.focus();
    await userEvent.setup().keyboard('{Enter}');
    expect(onDismiss).toHaveBeenCalled();
  });
});

describe('Toast', () => {
  it('passes axe inside a ToastViewport, roles by tone, refs, className', async () => {
    const ref = createRef<HTMLDivElement>();
    const vref = createRef<HTMLDivElement>();
    const onDismiss = vi.fn();
    const { container } = renderWithProvider(
      <ToastViewport ref={vref} className="v" data-testid="vp">
        <Toast ref={ref} tone="info" onDismiss={onDismiss} className="x" data-testid="t">Hi</Toast>
        <Toast tone="negative">Oops</Toast>
      </ToastViewport>,
    );
    await clean(container);
    expect(ref.current).toBe(screen.getByTestId('t'));
    expect(ref.current).toHaveAttribute('role', 'status');
    expect(ref.current).not.toHaveAttribute('aria-live');
    expect(screen.getByRole('alert')).toHaveTextContent('Oops');
    expect(vref.current).toHaveAttribute('aria-live', 'polite');
    expect(vref.current).toHaveAttribute('aria-relevant', 'additions');
    expect(vref.current).toHaveClass('v');
    await userEvent.setup().click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(onDismiss).toHaveBeenCalled();
  });
  it('dismiss button takes the toast ink, not the brand ink', () => {
    // jsdom can't resolve custom properties, so check the two halves: the
    // button is a `.scalar-button` inside `.scalar-toast`, and the stylesheet
    // points that pairing's ink at `--toast-ink`. The Toast (dismissible)
    // story checks the computed colour in a real browser.
    renderWithProvider(<Toast tone="info" onDismiss={() => undefined} data-testid="t">Hi</Toast>);
    const button = screen.getByRole('button', { name: 'Dismiss' });
    expect(button).toHaveClass('scalar-button');
    expect(button.closest('.scalar-toast')).toBe(screen.getByTestId('t'));
    const css = readFileSync(resolve(__dirname, '../../styles/components.css'), 'utf8');
    const rule = css.match(/\.scalar-toast \.scalar-button \{([^}]*)\}/)?.[1] ?? '';
    for (const prop of ['--btn-ink', '--btn-ink-hover', '--btn-ink-pressed']) {
      expect(rule).toContain(`${prop}: var(--toast-ink);`);
    }
  });
  it('legacy `style` string alias', () => {
    renderWithProvider(<Toast style="warning" data-testid="t">w</Toast>);
    expect(screen.getByTestId('t')).toHaveClass('scalar-toast--warning');
  });
});

describe('ProgressBar', () => {
  it('has progressbar semantics, passes axe, clamps, forwards ref', async () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = renderWithProvider(<ProgressBar ref={ref} label="Import" value={140} className="x" data-testid="p" />);
    await clean(container);
    const bar = screen.getByRole('progressbar', { name: 'Import' });
    expect(ref.current).toBe(bar);
    expect(bar).toHaveAttribute('aria-valuenow', '100');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
    expect(bar).toHaveClass('x');
  });
  it('indeterminate omits aria-valuenow', () => {
    renderWithProvider(<ProgressBar label="Working" />);
    expect(screen.getByRole('progressbar')).not.toHaveAttribute('aria-valuenow');
  });
  it('marks a full bar complete, and only a full one', () => {
    renderWithProvider(<><ProgressBar label="Done" value={100} /><ProgressBar label="Half" value={50} /></>);
    expect(screen.getByRole('progressbar', { name: 'Done' })).toHaveClass('scalar-progress--complete');
    expect(screen.getByRole('progressbar', { name: 'Half' })).not.toHaveClass('scalar-progress--complete');
  });
});

describe('Skeleton', () => {
  it('is aria-hidden, forwards ref/className/style; group is aria-busy with status', async () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = renderWithProvider(
      <SkeletonGroup data-testid="g">
        <Skeleton ref={ref} className="x" data-testid="s" width={10} style={{ opacity: 1 }} />
      </SkeletonGroup>,
    );
    await clean(container);
    expect(ref.current).toBe(screen.getByTestId('s'));
    expect(ref.current).toHaveAttribute('aria-hidden', 'true');
    expect(ref.current).toHaveClass('x');
    expect(screen.getByTestId('g')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('Loading…');
  });
});
