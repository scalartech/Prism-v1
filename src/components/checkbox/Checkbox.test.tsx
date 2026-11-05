import { createRef, useState } from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { renderWithProvider, checkA11y } from '../../test/render.js';
import { Checkbox, CheckboxItem } from './index.js';

describe('Checkbox', () => {
  it('forwards ref to the input, className to the label, data-testid to the input; no axe violations', async () => {
    const ref = createRef<HTMLInputElement>();
    const { container } = renderWithProvider(<Checkbox ref={ref} className="l" data-testid="cb">Agree</Checkbox>);
    expect(ref.current).toBe(screen.getByTestId('cb'));
    expect(ref.current!.closest('label')).toHaveClass('scalar-choice-field', 'l');
    expect(screen.getByRole('checkbox', { name: 'Agree' })).toBeInTheDocument();
    expect(await checkA11y(container)).toHaveNoViolations();
  });
  it('toggles with Space, uncontrolled and controlled', async () => {
    const onChange = vi.fn();
    function C() {
      const [on, setOn] = useState(false);
      return <Checkbox checked={on} onChange={(e) => { setOn(e.target.checked); onChange(); }}>Controlled</Checkbox>;
    }
    renderWithProvider(<><Checkbox defaultChecked={false}>Free</Checkbox><C /></>);
    for (const name of ['Free', 'Controlled']) {
      screen.getByRole('checkbox', { name }).focus();
      await userEvent.keyboard(' ');
      expect(screen.getByRole('checkbox', { name })).toBeChecked();
    }
    expect(onChange).toHaveBeenCalledTimes(1);
  });
  it('wires description, invalid and indeterminate', () => {
    renderWithProvider(
      <>
        <Checkbox description="More info" invalid>Label</Checkbox>
        <CheckboxItem aria-label="parent" indeterminate />
      </>,
    );
    const cb = screen.getByRole('checkbox', { name: 'Label' });
    expect(cb).toHaveAccessibleDescription('More info');
    expect(cb).toBeInvalid();
    expect(screen.getByRole('checkbox', { name: 'parent' })).toBePartiallyChecked();
  });
  it('accepts a consumer ref on CheckboxItem alongside the indeterminate ref', () => {
    const ref = createRef<HTMLInputElement>();
    renderWithProvider(<CheckboxItem ref={ref} aria-label="x" indeterminate />);
    expect(ref.current!.indeterminate).toBe(true);
  });
  it('puts the input over its drawn box when used on its own, so the box takes clicks', () => {
    renderWithProvider(<CheckboxItem aria-label="row" />);
    const input = screen.getByRole('checkbox', { name: 'row' });
    const wrap = input.parentElement!;
    expect(wrap).toHaveClass('scalar-choice-item');
    expect(wrap.querySelector('.scalar-checkbox-box')).not.toBeNull();
  });
});
