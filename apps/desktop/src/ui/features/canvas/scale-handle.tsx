import { useCallback } from "react";
import type { PointerEvent as ReactPointerEvent, ReactElement } from "react";

import type { ScaleCorner } from "./scale-drag-model.js";
import type { ResizeControl } from "./use-resize-handles.js";

const ScaleHandle = ({
  corner,
  down,
}: {
  readonly corner: ScaleCorner;
  readonly down: ResizeControl["onScaleDown"];
}): ReactElement => {
  const handleDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>): void => down(corner, event),
    [corner, down]
  );

  return (
    <div
      className={`resize-handle scale ${corner}`}
      data-testid={`scale-handle-${corner}`}
      aria-hidden="true"
      onPointerDown={handleDown}
    />
  );
};

export { ScaleHandle };
