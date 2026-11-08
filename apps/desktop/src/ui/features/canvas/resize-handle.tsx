import { useCallback } from "react";
import type { PointerEvent as ReactPointerEvent, ReactElement } from "react";

import type { ResizeControl, ResizeEdge } from "./use-resize-handles.js";

const ResizeHandle = ({
  edge,
  down,
}: {
  edge: ResizeEdge;
  down: ResizeControl["onHandleDown"];
}): ReactElement => {
  const handleDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>): void => down(edge, event),
    [edge, down]
  );

  return (
    <div
      className={`resize-handle ${edge}`}
      aria-hidden="true"
      onPointerDown={handleDown}
    />
  );
};

export { ResizeHandle };
