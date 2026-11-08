import { useCallback } from "react";
import type { PointerEvent as ReactPointerEvent, ReactElement } from "react";

import type { ResizeEdge } from "./frame-resize-handles.js";

const FrameResizeEdge = ({
  edge,
  isPassed,
  start,
}: {
  edge: ResizeEdge;
  isPassed: (event: ReactPointerEvent) => boolean;
  start: (event: ReactPointerEvent, edge: ResizeEdge) => void;
}): ReactElement => {
  const handleDown = useCallback(
    (event: ReactPointerEvent): void => {
      if (!isPassed(event)) {
        start(event, edge);
      }
    },
    [edge, isPassed, start]
  );

  return (
    <div
      className={`frame-resize ${edge}`}
      aria-hidden="true"
      data-edge={edge}
      onPointerDown={handleDown}
    />
  );
};

export { FrameResizeEdge };
