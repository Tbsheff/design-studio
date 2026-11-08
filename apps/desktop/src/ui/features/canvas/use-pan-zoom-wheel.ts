import { useEffect } from "react";
import type { RefObject } from "react";

import { wheelZoomAt } from "./pan-zoom-actions.js";
import { WHEEL_IDLE_MS, wheelZoomFactor } from "./pan-zoom-model.js";
import { schedulePaint } from "./pan-zoom-paint.js";
import { toWheelPixels } from "./pan-zoom-state.js";
import type { PanZoomState } from "./pan-zoom-state.js";

const WHEEL_EVENT = String("wheel");

const NON_PASSIVE: AddEventListenerOptions = { passive: false };

interface WheelCache {
  height: number;
  lastAt: number;
  rect: DOMRect | null;
}

const refreshWheelCache = (
  cache: WheelCache,
  element: HTMLElement,
  event: WheelEvent
): DOMRect => {
  let { rect } = cache;

  if (!rect || event.timeStamp - cache.lastAt > WHEEL_IDLE_MS) {
    rect = element.getBoundingClientRect();
    cache.rect = rect;
    cache.height = element.clientHeight;
  }

  cache.lastAt = event.timeStamp;

  return rect;
};

const handleWheel = (
  state: PanZoomState,
  cache: WheelCache,
  element: HTMLElement,
  event: WheelEvent
): void => {
  event.preventDefault();
  const rect = refreshWheelCache(cache, element, event);
  const { x: deltaX, y: deltaY } = toWheelPixels(event, cache.height);

  if (event.ctrlKey || event.metaKey) {
    wheelZoomAt(
      state,
      event.clientX - rect.left,
      event.clientY - rect.top,
      wheelZoomFactor(deltaY)
    );

    return;
  }

  state.offset = { x: state.offset.x - deltaX, y: state.offset.y - deltaY };
  schedulePaint(state);
};

const usePanZoomWheel = (
  state: PanZoomState,
  stageRef: RefObject<HTMLDivElement | null>
): void => {
  useEffect(() => {
    const element = stageRef.current;

    if (!element) {
      return;
    }

    const cache: WheelCache = { height: 0, lastAt: 0, rect: null };

    const onWheel = (event: Event): void => {
      if (event instanceof WheelEvent) {
        handleWheel(state, cache, element, event);
      }
    };

    element.addEventListener(WHEEL_EVENT, onWheel, NON_PASSIVE);

    return (): void =>
      element.removeEventListener(WHEEL_EVENT, onWheel, NON_PASSIVE);
  }, [state, stageRef]);
};

export { usePanZoomWheel };
