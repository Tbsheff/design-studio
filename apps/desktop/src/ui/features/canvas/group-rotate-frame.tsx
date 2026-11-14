import type { SelectionContext } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { GroupResizeHandle } from "./group-resize-handle.js";
import { GROUP_EDGES } from "./group-resize-model.js";
import { toRectStyle } from "./overlay-styles.js";
import { RotateAngleLabel } from "./rotate-angle-label.js";
import { RotateZones } from "./rotate-zone.js";
import type { ResizeControl } from "./use-resize-handles.js";

const toFrameClass = (isLive: boolean): string => {
  if (isLive) {
    return "resize-frame active";
  }

  return "resize-frame";
};

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

  const live = control.groupBox;

  return (
    <div
      className={toFrameClass(live !== null)}
      data-testid="rotate-group-frame"
      style={toRectStyle(live ?? rect, null)}
    >
      {live === null && <RotateZones down={control.onRotateDown} />}
      {GROUP_EDGES.map((edge) => (
        <GroupResizeHandle key={edge} edge={edge} down={control.onGroupDown} />
      ))}
      {control.rotateLabel && <RotateAngleLabel label={control.rotateLabel} />}
      {live && (
        <span className="resize-label" data-testid="group-resize-label">
          {Math.round(live.width)}
          {copy.times2}
          {Math.round(live.height)}
        </span>
      )}
    </div>
  );
};

export { GroupRotateFrame };
