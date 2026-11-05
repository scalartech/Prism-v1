import { forwardRef, useEffect, useMemo, useRef, type InputHTMLAttributes } from 'react';
import { composeRefs, cx } from '../../utils/index.js';
import { Icon } from '../icon/Icon.js';
import { Check, Minus } from '../icon/glyphs.js';

export type ChoiceSize = 'm' | 's';

export interface CheckboxItemProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> {
  /** M is 24px, S is 16px. The drawn box, not the target. */
  size?: ChoiceSize;
  /**
   * For a parent whose children are partly selected. A display state — never
   * something the user selects directly. Exposed natively as "mixed".
   */
  indeterminate?: boolean;
  /** Draws the error edge and sets `aria-invalid`. Point `aria-describedby` at the error text. */
  invalid?: boolean;
  /** Lands on the drawn box `span`, not the `<input>` (which takes `ref` and every other native prop). */
  className?: string;
}

/**
 * Checkbox Item — the checkbox control on its own.
 *
 * Controlled (`checked` + `onChange`) or uncontrolled (`defaultChecked`), as a
 * native checkbox. It has no label of its own: give it `aria-label` or
 * `aria-labelledby`, or use `Checkbox`, whose wrapping label also carries the
 * 44px target the drawn 16–24px box cannot reach.
 */
export const CheckboxItem = forwardRef<HTMLInputElement, CheckboxItemProps>(function CheckboxItem(
  { size = 'm', indeterminate = false, invalid, className, ...rest },
  ref,
) {
  const inner = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (inner.current) inner.current.indeterminate = indeterminate;
  }, [indeterminate]);
  const setRefs = useMemo(() => composeRefs<HTMLInputElement>(inner, ref), [ref]);

  // The wrapper puts the (invisible) input over the drawn box, so the box takes clicks on its own —
  // in a file row, a folder row or a date band — not only inside a wrapping <label>.
  return (
    <span className="scalar-choice-item">
      <input
        ref={setRefs}
        type="checkbox"
        className="scalar-choice-input"
        data-tone={invalid ? 'negative' : undefined}
        aria-invalid={invalid || undefined}
        {...rest}
      />
      <span className={cx('scalar-choice', 'scalar-checkbox-box', `scalar-choice--${size}`, className)} aria-hidden>
        <Icon size={size === 'm' ? 's' : 'xs'} tone="inherit">
          {indeterminate ? <Minus /> : <Check />}
        </Icon>
      </span>
    </span>
  );
});
