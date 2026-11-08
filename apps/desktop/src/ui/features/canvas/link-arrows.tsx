import { useCallback, useMemo } from "react";
import type { CSSProperties, ReactElement } from "react";

import { ArrowMarkers } from "./arrow-markers.js";
import type { CanvasFrame } from "./canvas-frames-model.js";
import { LinkArrowItem } from "./link-arrow-item.js";
import { LinkBrokenBadge } from "./link-broken-badge.js";
import { LinkStartAnchor } from "./link-start-anchor.js";
import { groupBrokenByFrame } from "./link-view.js";
import { toBounds, toBox } from "./prototype-model.js";
import type { Box } from "./prototype-model.js";
import type { LinkState } from "./use-link-rects.js";

interface ArrowProps {
  readonly states: LinkState[];
  readonly frames: CanvasFrame[];
  readonly active: CanvasFrame;
  readonly startId: string;
  readonly arrows: boolean;
  readonly selectedId: string | null;
  readonly dropTarget: string | null;
}

const LinkArrows = ({
  states,
  frames,
  active,
  startId,
  arrows,
  selectedId,
  dropTarget,
}: ArrowProps): ReactElement => {
  const view = toBounds(frames, active);

  const toFrameBox = useCallback(
    (id: string | null): Box | null => {
      const frame = frames.find((item) => item.id === id);

      if (frame) {
        return toBox(frame, active);
      }

      return null;
    },
    [active, frames]
  );

  const style = useMemo<CSSProperties>(
    () => ({
      height: view.height,
      left: view.x,
      top: view.y,
      width: view.width,
    }),
    [view.height, view.width, view.x, view.y]
  );

  const start = toFrameBox(startId);
  const drop = toFrameBox(dropTarget);
  const brokenByFrame = groupBrokenByFrame(states);

  return (
    <div className="link-layer" aria-hidden="true">
      <svg
        className="link-arrows"
        aria-hidden="true"
        style={style}
        viewBox={`${view.x} ${view.y} ${view.width} ${view.height}`}
      >
        <ArrowMarkers />
        {drop && (
          <rect
            className="link-drop"
            x={drop.x}
            y={drop.y}
            width={drop.width}
            height={drop.height}
            vectorEffect="non-scaling-stroke"
          />
        )}
        {arrows &&
          states.map((state) => (
            <LinkArrowItem
              key={state.link.id}
              state={state}
              selectedId={selectedId}
              toFrameBox={toFrameBox}
            />
          ))}
      </svg>
      {start && <LinkStartAnchor start={start} />}
      {[...brokenByFrame].map(([frameId, list]) => (
        <LinkBrokenBadge key={frameId} box={toFrameBox(frameId)} list={list} />
      ))}
    </div>
  );
};

export { LinkArrows };
