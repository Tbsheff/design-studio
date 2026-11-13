import { useMemo } from "react";
import type { CSSProperties, ReactElement } from "react";

import type { Box, CanvasLayout } from "./canvas-frames-model.js";
import { FrameSelectMenu } from "./frame-select-menu.js";
import { toGroupFrames, toGroupRect } from "./frame-selection-model.js";
import { useSelectedFrameIds } from "./use-frame-selection.js";

interface Origin {
  readonly x: number;
  readonly y: number;
}

const toBoxStyle = (box: Box, origin: Origin): CSSProperties => ({
  height: box.height,
  left: box.x - origin.x,
  top: box.y - origin.y,
  width: box.width,
});

const FrameSelectionLayer = ({
  layout,
  origin,
  removeFramesAt,
}: {
  layout: CanvasLayout;
  origin: Origin;
  removeFramesAt: (ids: readonly string[]) => void;
}): ReactElement | null => {
  const ids = useSelectedFrameIds();

  const frames = useMemo(() => toGroupFrames(layout, ids), [layout, ids]);
  const frameIds = useMemo(() => frames.map((frame) => frame.id), [frames]);
  const group = useMemo(() => toGroupRect(frames), [frames]);

  const groupStyle = useMemo((): CSSProperties | null => {
    if (group === null) {
      return null;
    }

    return toBoxStyle(group, origin);
  }, [group, origin]);

  if (groupStyle === null) {
    return null;
  }

  return (
    <div className="frame-select-layer" data-testid="frame-selection">
      {frames.map((frame) => (
        <div
          key={frame.id}
          className="frame-select-outline"
          style={toBoxStyle(frame, origin)}
        />
      ))}
      {frames.length > 1 && (
        <div className="frame-select-group" style={groupStyle}>
          <FrameSelectMenu ids={frameIds} removeFramesAt={removeFramesAt} />
        </div>
      )}
    </div>
  );
};

export { FrameSelectionLayer };
