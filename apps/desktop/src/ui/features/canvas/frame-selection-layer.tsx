import { useMemo } from "react";
import type { CSSProperties, ReactElement } from "react";

import type { Box, CanvasLayout } from "./canvas-frames-model.js";
import { copy } from "./copy.js";
import { FrameAlignBar } from "./frame-align-bar.js";
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
}: {
  layout: CanvasLayout;
  origin: Origin;
}): ReactElement | null => {
  const ids = useSelectedFrameIds();

  const frames = useMemo(() => toGroupFrames(layout, ids), [layout, ids]);
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
          <FrameAlignBar count={frames.length} />
          <output className="frame-select-count" data-tip={copy.frameSelectTip}>
            {frames.length}
            {copy.frameSelectCount}
          </output>
        </div>
      )}
    </div>
  );
};

export { FrameSelectionLayer };
