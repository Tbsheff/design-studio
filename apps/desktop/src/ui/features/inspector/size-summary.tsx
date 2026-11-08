import type {
  PointerEvent,
  PointerEvent as ReactPointerEvent,
  ReactElement,
} from "react";

import { AXIS_NAME, AXIS_SHORT, toSizeDescription } from "./size-row-model.js";
import type { Axis } from "./sizing-model.js";

const SizeSummary = ({
  axis,
  label,
  px,
  onDrag,
  onStart,
  onStartPointer,
}: {
  readonly axis: Axis;
  readonly label: string;
  readonly px: string;
  readonly onDrag: (event: ReactPointerEvent<HTMLLabelElement>) => void;
  readonly onStart: () => void;
  readonly onStartPointer: (event: PointerEvent<HTMLInputElement>) => void;
}): ReactElement => (
  <div
    className="ins-field ins-size-display"
    data-tip={toSizeDescription(axis, label, px)}
  >
    <label htmlFor={`ins-${axis}`} className="ins-scrub" onPointerDown={onDrag}>
      {AXIS_SHORT[axis]}
    </label>
    <input
      id={`ins-${axis}`}
      className="ins-input num"
      aria-label={`${AXIS_NAME[axis]}, ${label}, ${px}`}
      value={label}
      readOnly
      onFocus={onStart}
      onPointerDown={onStartPointer}
    />
  </div>
);

export { SizeSummary };
