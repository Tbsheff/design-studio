import type { SelectionContext } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { toRectStyle } from "./overlay-styles.js";
import { ResizeHandle } from "./resize-handle.js";
import { SCALE_CORNERS } from "./scale-drag-model.js";
import { ScaleGhostBox } from "./scale-ghost-box.js";
import { ScaleHandle } from "./scale-handle.js";
import type { ResizeControl, ResizeEdge } from "./use-resize-handles.js";

const EDGES: ResizeEdge[] = ["e", "s", "se"];
const COMPACT_EDGES: ResizeEdge[] = ["se"];
const COMPACT_PX = 40;

const ResizeHandles = ({
  control,
  rect,
  zoom,
}: {
  control: ResizeControl;
  rect: SelectionContext["rect"];
  zoom: number;
}): ReactElement => {
  const { ghost, isScaling, live } = control;
  const compact = Math.min(rect.width, rect.height) * zoom < COMPACT_PX;

  let part: "" | " active" = "";

  if (live) {
    part = " active";
  }

  let part3: "" | " compact" = "";

  if (compact) {
    part3 = " compact";
  }

  let liveSize: { height: number; width: number } | null = null;

  if (live) {
    liveSize = { height: live.boxHeight, width: live.boxWidth };
  }

  let result: ResizeEdge[] = EDGES;

  if (compact) {
    result = COMPACT_EDGES;
  }

  if (isScaling) {
    result = [];
  }

  let part4: "" | " scaling" = "";

  if (isScaling) {
    part4 = " scaling";
  }

  return (
    <div
      className={`resize-frame${part}${part3}${part4}`}
      data-testid="resize-frame"
      style={toRectStyle(rect, liveSize)}
    >
      {result.map((edge) => (
        <ResizeHandle key={edge} edge={edge} down={control.onHandleDown} />
      ))}
      {isScaling &&
        SCALE_CORNERS.map((corner) => (
          <ScaleHandle
            key={corner}
            corner={corner}
            down={control.onScaleDown}
          />
        ))}
      {ghost && <ScaleGhostBox ghost={ghost} rect={rect} />}
      {live && (
        <span className="resize-label" data-testid="resize-label">
          {live.width}
          {copy.times2}
          {live.height}
        </span>
      )}
    </div>
  );
};

export { ResizeHandles };
