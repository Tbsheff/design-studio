import { useCallback, useRef } from "react";
import type { PointerEvent } from "react";

import {
  toDistance,
  toLocalPoint,
  toMiddle,
  toPinchView,
} from "./canvas-view-model.js";
import type { CanvasView, Pinch, Point } from "./canvas-view-model.js";

type ViewChange = (change: (view: CanvasView) => CanvasView) => void;

type StageEvent = PointerEvent<HTMLDivElement>;

interface CanvasPointers {
  readonly onPointerDown: (event: StageEvent) => void;
  readonly onPointerMove: (event: StageEvent) => void;
  readonly onPointerUp: (event: StageEvent) => void;
  readonly wasDragged: () => boolean;
}

const DRAG_SLOP = 4;

const PINCH_COUNT = 2;

const toEventPoint = (event: StageEvent): Point =>
  toLocalPoint(event.currentTarget, event.clientX, event.clientY);

const useCanvasPointers = (setView: ViewChange): CanvasPointers => {
  const pointers = useRef(new Map<number, Point>());
  const pinch = useRef<Pinch | null>(null);
  const travel = useRef(0);

  const onPointerDown = useCallback((event: StageEvent): void => {
    travel.current = 0;
    pointers.current.set(event.pointerId, toEventPoint(event));
    const list = [...pointers.current.values()];

    if (list.length === PINCH_COUNT) {
      pinch.current = { distance: toDistance(list), middle: toMiddle(list) };
    }
  }, []);

  const onPointerMove = useCallback(
    (event: StageEvent): void => {
      const before = pointers.current.get(event.pointerId);

      if (!before) {
        return;
      }

      const point = toEventPoint(event);

      pointers.current.set(event.pointerId, point);
      travel.current += Math.hypot(point.x - before.x, point.y - before.y);
      const list = [...pointers.current.values()];
      const last = pinch.current;

      if (list.length === PINCH_COUNT && last) {
        const next = { distance: toDistance(list), middle: toMiddle(list) };

        pinch.current = next;
        setView((view) => toPinchView(view, last, next));

        return;
      }

      setView((view) => ({
        ...view,
        x: view.x + point.x - before.x,
        y: view.y + point.y - before.y,
      }));
    },
    [setView]
  );

  const onPointerUp = useCallback((event: StageEvent): void => {
    pointers.current.delete(event.pointerId);
    pinch.current = null;
  }, []);

  const wasDragged = useCallback((): boolean => travel.current > DRAG_SLOP, []);

  return { onPointerDown, onPointerMove, onPointerUp, wasDragged };
};

export { useCanvasPointers };

export type { CanvasPointers };
