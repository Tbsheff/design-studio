import { useCallback } from "react";
import type { PointerEvent as ReactPointerEvent, ReactElement } from "react";

import type { GroupEdge } from "./group-resize-model.js";
import type { ResizeControl } from "./use-resize-handles.js";

const GroupResizeHandle = ({
  edge,
  down,
}: {
  readonly edge: GroupEdge;
  readonly down: ResizeControl["onGroupDown"];
}): ReactElement => {
  const handleDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>): void => down(edge, event),
    [edge, down]
  );

  return (
    <div
      className={`resize-handle group ${edge}`}
      data-testid={`group-resize-${edge}`}
      aria-hidden="true"
      onPointerDown={handleDown}
    />
  );
};

export { GroupResizeHandle };
