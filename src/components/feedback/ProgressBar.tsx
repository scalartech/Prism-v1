import { forwardRef, type HTMLAttributes } from 'react';
import { cx } from '../../utils/cx.js';

type ProgressName = { label: string; 'aria-labelledby'?: string } | { label?: string; 'aria-labelledby': string };

export type ProgressBarProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
  /**
   * Percentage complete, 0–100. Omit it for an indeterminate bar.
   *
   * Use determinate whenever the total is known. A fake determinate bar that
   * stalls at 90% destroys trust faster than an honest indeterminate one.
   */
  value?: number;
} & ProgressName;
// `label` names what is running; a bar alone says something is running, not what.
// Pass `label` or `aria-labelledby` — the compiler requires one.

/**
 * Progress Bar — how far along a task is.
 *
 * At 100% the fill turns Positive, like the Progress Ring's complete state —
 * pair it with words ("All 29 resolved") so colour is never the only signal.
 *
 * `role="progressbar"` with `aria-valuemin/max/now`; indeterminate omits
 * `aria-valuenow`. The sliding animation is switched off under
 * prefers-reduced-motion.
 */
export const ProgressBar = forwardRef<HTMLDivElement, ProgressBarProps>(function ProgressBar(
  { value, label, className, ...rest },
  ref,
) {
  const indeterminate = value === undefined;
  const clamped = indeterminate ? 0 : Math.min(100, Math.max(0, value));

  return (
    <div
      ref={ref}
      className={cx('scalar-progress', indeterminate && 'scalar-progress--indeterminate', clamped === 100 && 'scalar-progress--complete', className)}
      aria-label={label}
      {...rest}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={indeterminate ? undefined : clamped}
    >
      <div className="scalar-progress__fill" style={indeterminate ? undefined : { translate: `${clamped - 100}% 0` }} />
    </div>
  );
});
