import type { ShareViewerComment } from "@design-studio/contracts/share-play";
import { useRef } from "react";
import type { ReactElement } from "react";

import { toWorldStyle } from "./canvas-view-model.js";
import { ShareFrameView } from "./share-frame-view.js";
import type { PinSpot, ViewerFrame } from "./share-viewer-model.js";
import { toFramePins } from "./share-viewer-model.js";
import { ShareZoomBar } from "./share-zoom-bar.js";
import { useCanvasView } from "./use-canvas-view.js";

interface ShareCanvasProps {
  readonly comments: readonly ShareViewerComment[];
  readonly draft: PinSpot | null;
  readonly frames: readonly ViewerFrame[];
  readonly selected: number;
  readonly onPick: (spot: PinSpot) => void;
}

const ShareCanvas = ({
  comments,
  draft,
  frames,
  onPick,
  selected,
}: ShareCanvasProps): ReactElement => {
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useCanvasView(stage, frames);
  const { onFit, onPointerDown, onPointerMove, onPointerUp } = canvas;
  const { onZoomIn, onZoomOut, view, wasDragged } = canvas;

  return (
    <div
      ref={stage}
      className="share-stage"
      data-testid="share-canvas"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div className="share-world" style={toWorldStyle(view)}>
        {frames.map((frame, index) => (
          <ShareFrameView
            key={frame.id}
            frame={frame}
            index={index}
            isSelected={index === selected}
            pins={toFramePins(comments, index)}
            draft={draft}
            wasDragged={wasDragged}
            onPick={onPick}
          />
        ))}
      </div>
      <ShareZoomBar
        scale={view.scale}
        onFit={onFit}
        onZoomIn={onZoomIn}
        onZoomOut={onZoomOut}
      />
    </div>
  );
};

export { ShareCanvas };
