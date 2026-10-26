import { useState } from 'react';
import { expandBox, SIDES, type Side } from '../cssValues';
import { proxyEdit } from '../proxyEdit';
import type { DirectEdit } from '../useDirectEdit';
import { Icon } from './Icon';
import { NumberField } from './NumberField';

const CORNERS: { side: Side; short: string; label: string }[] = [
  { side: 'top', short: 'TL', label: 'Top left radius' },
  { side: 'right', short: 'TR', label: 'Top right radius' },
  { side: 'left', short: 'BL', label: 'Bottom left radius' },
  { side: 'bottom', short: 'BR', label: 'Bottom right radius' },
];

export function joinCorners(corners: Record<Side, string>): string {
  const values = SIDES.map((side) => corners[side] || '0');
  return values.every((value) => value === values[0]) ? (values[0] ?? '0') : values.join(' ');
}

function cornersOf(radius: string): Record<Side, string> {
  return expandBox(radius.split('/')[0]);
}

function differ(radius: string): boolean {
  const corners = cornersOf(radius);
  return SIDES.some((side) => corners[side] !== corners.top);
}

export function RadiusField({ edit, short = 'R' }: { edit: DirectEdit; short?: string }) {
  const [split, setSplit] = useState(() => differ(edit.values['border-radius']));
  const radius = edit.values['border-radius'];
  const corners = cornersOf(radius);
  const toggle = (
    <button
      type="button"
      className="icon-btn small ins-toggle"
      aria-label="Independent corners"
      aria-pressed={split}
      title={split ? 'Set all corners together' : 'Set each corner'}
      onClick={() => setSplit((on) => !on)}
    >
      <Icon name="corners" size={14} />
    </button>
  );
  if (!split) {
    return (
      <div className="ins-radius">
        <NumberField short={short} spec={{ prop: 'border-radius', label: 'Border radius', edit, min: 0 }} />
        {toggle}
      </div>
    );
  }
  return (
    <div className="ins-radius split">
      <div className="ins-grid">
        {CORNERS.map(({ side, short, label }) => (
          <NumberField
            key={side}
            id={`ins-radius-${side}`}
            short={short}
            tokens={false}
            spec={{
              prop: 'border-radius',
              label,
              min: 0,
              edit: proxyEdit(edit, 'border-radius', corners[side], (value) => ({ 'border-radius': joinCorners({ ...corners, [side]: value }) }), ['border-radius']),
            }}
          />
        ))}
      </div>
      {toggle}
    </div>
  );
}
