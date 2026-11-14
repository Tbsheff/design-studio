import type { CSSProperties, ReactElement } from "react";

import { toAngleLabel } from "./rotate-drag-model.js";
import type { RotateLabel } from "./rotate-drag-model.js";

const toLabelStyle = (label: RotateLabel): CSSProperties => ({
  left: label.x,
  top: label.y,
});

const RotateAngleLabel = ({
  label,
}: {
  readonly label: RotateLabel;
}): ReactElement => (
  <span
    className="rotate-label"
    data-testid="rotate-label"
    style={toLabelStyle(label)}
  >
    {toAngleLabel(label.angle)}
  </span>
);

export { RotateAngleLabel };
