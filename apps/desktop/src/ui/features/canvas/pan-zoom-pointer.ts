import type { PointerEvent as ReactPointerEvent } from "react";

import { zoomAt } from "./pan-zoom-actions.js";
import { CLICK_ZOOM } from "./pan-zoom-model.js";
import { schedulePaint } from "./pan-zoom-paint.js";
import type { PanZoomState } from "./pan-zoom-state.js";

const startPan = (
  state: PanZoomState,
  event: ReactPointerEvent,
  setPanning: (isPanning: boolean) => void
): void => {
  event.preventDefault();
  const target = event.currentTarget;
  target.setPointerCapture(event.pointerId);
  setPanning(true);
  let lastX = event.clientX;
  let lastY = event.clientY;

  const move = (moveEvent: Event): void => {
    if (!(moveEvent instanceof PointerEvent)) {
      return;
    }

    const deltaX = moveEvent.clientX - lastX;
    const deltaY = moveEvent.clientY - lastY;
    lastX = moveEvent.clientX;
    lastY = moveEvent.clientY;

    if (deltaX === 0 && deltaY === 0) {
      return;
    }

    state.offset = {
      x: state.offset.x + deltaX,
      y: state.offset.y + deltaY,
    };
    schedulePaint(state);
  };

  const end = (): void => {
    setPanning(false);
    state.requestRender();
    target.removeEventListener("pointermove", move);
    target.removeEventListener("pointerup", end);
    target.removeEventListener("pointercancel", end);
  };

  target.addEventListener("pointermove", move);
  target.addEventListener("pointerup", end);
  target.addEventListener("pointercancel", end);
};

interface HeldState {
  spaceHeld: boolean;
  zoomHeld: boolean;
}

const toClickFactor = (event: ReactPointerEvent): number => {
  if (event.altKey) {
    return 1 / CLICK_ZOOM;
  }

  return CLICK_ZOOM;
};

const handlePointerDown = (
  state: PanZoomState,
  event: ReactPointerEvent,
  held: HeldState,
  setPanning: (isPanning: boolean) => void
): void => {
  if (event.button === 0 && held.zoomHeld && !held.spaceHeld) {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();

    zoomAt(
      state,
      event.clientX - rect.left,
      event.clientY - rect.top,
      toClickFactor(event)
    );

    return;
  }

  if (event.button === 1 || (event.button === 0 && held.spaceHeld)) {
    startPan(state, event, setPanning);
  }
};

export { handlePointerDown };
