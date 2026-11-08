import type { ReactElement } from "react";

import { AXIS_NAME, AXIS_SHORT } from "./size-row-model.js";
import type { Axis } from "./sizing-model.js";

const SizeLive = ({
  axis,
  value,
}: {
  readonly axis: Axis;
  readonly value: number;
}): ReactElement => (
  <output
    className="ins-field ins-size-display"
    aria-label={`${AXIS_NAME[axis]} ${value}px while resizing`}
  >
    <span className="ins-scrub static" aria-hidden="true">
      {AXIS_SHORT[axis]}
    </span>
    <input
      className="ins-input num"
      tabIndex={-1}
      aria-hidden="true"
      value={`${value}px`}
      readOnly
    />
  </output>
);

export { SizeLive };
