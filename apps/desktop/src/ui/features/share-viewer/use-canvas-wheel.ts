import { useLayoutEffect } from "react";
import type { RefObject } from "react";

import { toLocalPoint, toZoomedView } from "./canvas-view-model.js";
import type { CanvasView } from "./canvas-view-model.js";

type ViewChange = (change: (view: CanvasView) => CanvasView) => void;

const NON_PASSIVE: AddEventListenerOptions = { passive: false };

const WHEEL_EVENT = String("wheel");

const WHEEL_ZOOM = 0.01;

const toWheelView = (
  view: CanvasView,
  event: WheelEvent,
  element: HTMLElement
): CanvasView => {
  if (event.ctrlKey || event.metaKey) {
    const point = toLocalPoint(element, event.clientX, event.clientY);
    const factor = Math.exp(-event.deltaY * WHEEL_ZOOM);

    return toZoomedView(view, factor, point.x, point.y);
  }

  return { ...view, x: view.x - event.deltaX, y: view.y - event.deltaY };
};

const useCanvasWheel = (
  stage: RefObject<HTMLDivElement | null>,
  setView: ViewChange
): void => {
  useLayoutEffect(() => {
    const element = stage.current;

    if (!element) {
      return;
    }

    const onWheel = (event: Event): void => {
      if (!(event instanceof WheelEvent)) {
        return;
      }

      event.preventDefault();
      setView((view) => toWheelView(view, event, element));
    };

    element.addEventListener(WHEEL_EVENT, onWheel, NON_PASSIVE);

    return (): void => {
      element.removeEventListener(WHEEL_EVENT, onWheel, NON_PASSIVE);
    };
  }, [stage, setView]);
};

export { useCanvasWheel };
