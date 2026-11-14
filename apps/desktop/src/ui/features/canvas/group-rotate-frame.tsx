import type { SelectionContext } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { toRectStyle } from "./overlay-styles.js";
import { RotateAngleLabel } from "./rotate-angle-label.js";
import { RotateZones } from "./rotate-zone.js";
import type { ResizeControl } from "./use-resize-handles.js";

const GroupRotateFrame = ({
  control,
  rect,
}: {
  readonly control?: ResizeControl;
  readonly rect: SelectionContext["rect"] | null;
}): ReactElement | null => {
  if (
    !control ||
    rect === null ||
    control.target !== null ||
    control.rotateTargets.length < 2
  ) {
    return null;
  }

  return (
    <div
      className="resize-frame"
      data-testid="rotate-group-frame"
      style={toRectStyle(rect, null)}
    >
      <RotateZones down={control.onRotateDown} />
      {control.rotateLabel && <RotateAngleLabel label={control.rotateLabel} />}
    </div>
  );
};

export { GroupRotateFrame };
