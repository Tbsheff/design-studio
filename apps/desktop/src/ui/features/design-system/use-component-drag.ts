import type { InsertableComponent } from "@design-studio/contracts/insert";
import { useCallback, useMemo, useRef, useState } from "react";

import { toDragHandlers } from "./component-drag-handlers.js";
import type {
  ComponentDrag,
  Drag,
  DragGhostState,
  DragRefs,
} from "./component-drag-state.js";
import { useCancelOnEscape } from "./use-cancel-on-escape.js";

const useComponentDrag = (): ComponentDrag => {
  const drag = useRef<Drag | null>(null);
  const dragged = useRef(false);
  const frame = useRef(0);
  const [ghost, setGhost] = useState<DragGhostState | null>(null);

  const cancel = useCallback((): void => {
    drag.current = null;
    setGhost(null);
  }, []);

  useCancelOnEscape(ghost !== null, cancel);

  const refs = useMemo<DragRefs>(
    () => ({ cancel, drag, dragged, frame, setGhost }),
    [cancel]
  );

  const handlers = useCallback(
    (component: InsertableComponent) => toDragHandlers(refs, component),
    [refs]
  );

  return { ghost, handlers };
};

export { useComponentDrag };
