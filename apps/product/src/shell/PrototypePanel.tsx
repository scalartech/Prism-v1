/**
 * The prototype's own controls, kept off the product's surfaces: a small card
 * pinned bottom-left with View as (Scalar analyst · Client user) and whatever
 * the page passes in (Save a valuation change, Reset prototype data). It folds
 * to one button so it never covers content for long.
 *
 * Render it in a screen's `overlay`. Never ships: a real build reads the role
 * from the session and has no reset.
 */
import { useState, type ReactNode } from 'react';
import { Button, ButtonIcon, Icon, Overline, SegmentedControl, color, elevation, icons, radius, space, zIndex } from '@scalar/design-system';
import { useViewAs, viewerLabel, type Viewer } from './viewAs.js';

export function PrototypePanel({ children }: { children?: ReactNode }) {
  const [viewer, setViewer] = useViewAs();
  const [open, setOpen] = useState(true);
  const place = { position: 'fixed', left: space.l, bottom: space.l, zIndex: zIndex.overlay } as const;

  if (!open) {
    return (
      <div style={place}>
        <Button size="s" variant="secondary" style={{ boxShadow: elevation.overlay }} leadingIcon={<Icon size="s" tone="inherit"><icons.Science /></Icon>} onClick={() => setOpen(true)}>
          {`Prototype · ${viewerLabel[viewer]}`}
        </Button>
      </div>
    );
  }
  return (
    <aside
      aria-label="Prototype controls"
      style={{
        ...place, display: 'flex', flexDirection: 'column', gap: space.s, padding: space.m,
        background: color.bg.surface, border: `1px solid ${color.stroke.default}`, borderRadius: radius.m, boxShadow: elevation.overlay,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: space.m }}>
        <Overline as="h2">Prototype</Overline>
        <ButtonIcon variant="tertiary" size="xs" label="Hide prototype controls" onClick={() => setOpen(false)} icon={<Icon size="s" tone="inherit"><icons.Close /></Icon>} />
      </div>
      <SegmentedControl<Viewer>
        label="View as"
        value={viewer}
        onChange={setViewer}
        options={[{ value: 'analyst', label: viewerLabel.analyst }, { value: 'client', label: viewerLabel.client }]}
      />
      {children && <div style={{ display: 'flex', gap: space.s, flexWrap: 'wrap' }}>{children}</div>}
    </aside>
  );
}
