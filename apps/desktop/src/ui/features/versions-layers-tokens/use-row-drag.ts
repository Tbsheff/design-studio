import type { LayerNode } from "@design-studio/contracts";
import { useCallback, useRef, useState } from "react";
import type { PointerEvent, RefObject } from "react";

import { toRowDrop } from "./layer-drag-model.js";
import type { DragHandlers, RowDrop } from "./layer-drag-model.js";
import { DRAG_START_PX } from "./layers-constants.js";

interface DragState {
  active: boolean;
  readonly id: number;
  readonly startY: number;
}

interface RowDragApi {
  readonly drop: RowDrop | null;
  readonly dragging: number | null;
  readonly onPointerCancel: () => void;
  readonly onPointerMove: (event: PointerEvent<HTMLDivElement>) => void;
  readonly onPointerUp: () => void;
  readonly onPress: (id: number, event: PointerEvent<HTMLDivElement>) => void;
}

const useRowDrag = (
  rows: LayerNode[],
  rowsRef: RefObject<HTMLDivElement | null>,
  handlers: DragHandlers
): RowDragApi => {
  const drag = useRef<DragState | null>(null);
  const [drop, setDrop] = useState<RowDrop | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);

  const reset = useCallback((): void => {
    drag.current = null;
    setDrop(null);
    setDragging(null);
  }, []);

  const onPress = useCallback(
    (id: number, event: PointerEvent<HTMLDivElement>): void => {
      drag.current = null;

      if (handlers.onMove || handlers.onDrop) {
        const active = false;
        const startY = event.clientY;

        drag.current = { active, id, startY };
      }
    },
    [handlers.onDrop, handlers.onMove]
  );

  const onPointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>): void => {
      const { current } = drag;

      if (!current || event.buttons % 2 === 0) {
        return;
      }

      if (!current.active) {
        if (Math.abs(event.clientY - current.startY) < DRAG_START_PX) {
          return;
        }

        current.active = true;
        setDragging(current.id);
        event.currentTarget.setPointerCapture(event.pointerId);
      }

      const top = rowsRef.current?.getBoundingClientRect().top ?? 0;

      setDrop(toRowDrop(rows, current.id, event.clientY - top, handlers));
    },
    [handlers, rows, rowsRef]
  );

  const onPointerUp = useCallback((): void => {
    if (drag.current?.active && drop) {
      drop.commit();
    }

    reset();
  }, [drop, reset]);

  const onPointerCancel = reset;

  return {
    dragging,
    drop,
    onPointerCancel,
    onPointerMove,
    onPointerUp,
    onPress,
  };
};

export { useRowDrag };

export type { RowDragApi };
