import type { SelectionContext } from "@design-studio/contracts";
import type { CSSProperties, ReactElement } from "react";

import { toScaleLabel } from "./scale-drag-model.js";
import type { ScaleGhost } from "./scale-drag-model.js";

const toGhostStyle = (
  ghost: ScaleGhost,
  rect: SelectionContext["rect"]
): CSSProperties => ({
  height: ghost.rect.height,
  left: ghost.rect.x - rect.x,
  top: ghost.rect.y - rect.y,
  width: ghost.rect.width,
});

const ScaleGhostBox = ({
  ghost,
  rect,
}: {
  readonly ghost: ScaleGhost;
  readonly rect: SelectionContext["rect"];
}): ReactElement => (
  <div
    className="scale-ghost"
    data-testid="scale-ghost"
    style={toGhostStyle(ghost, rect)}
  >
    <span className="resize-label" data-testid="scale-label">
      {toScaleLabel(ghost.percent)}
    </span>
  </div>
);

export { ScaleGhostBox };
