import { wheelZoomAt } from "./pan-zoom-actions.js";
import { WHEEL_IDLE_MS, wheelZoomFactor } from "./pan-zoom-model.js";
import { toView, toWheelPixels } from "./pan-zoom-state.js";
import type { FrameOrigin, PanZoomState } from "./pan-zoom-state.js";
import type { FrameWheel } from "./pan-zoom-wheel-types.js";

const toFrameOrigin = (
  state: PanZoomState,
  target: HTMLIFrameElement,
  stageElement: HTMLElement,
  now: number
): FrameOrigin => {
  const frameRect = target.getBoundingClientRect();
  const stageRect = stageElement.getBoundingClientRect();
  const view = toView(state);

  return {
    at: now,
    frame: target,
    height: target.clientHeight,
    x: (frameRect.left - stageRect.left - view.x) / view.zoom,
    y: (frameRect.top - stageRect.top - view.y) / view.zoom,
  };
};

const isOriginStale = (
  origin: FrameOrigin | null,
  frame: HTMLIFrameElement,
  now: number
): boolean =>
  !origin || origin.frame !== frame || now - origin.at > WHEEL_IDLE_MS;

const applyFrameWheel = (
  state: PanZoomState,
  frame: HTMLIFrameElement | null,
  frameWheel: FrameWheel
): void => {
  const stageElement = state.stageRef.current;

  if (!stageElement || !frame) {
    return;
  }

  const now = performance.now();
  let origin = state.frameOrigin;

  if (!origin || isOriginStale(origin, frame, now)) {
    origin = toFrameOrigin(state, frame, stageElement, now);
  }

  origin.at = now;
  state.frameOrigin = origin;
  const view = toView(state);
  const { y: deltaY } = toWheelPixels(frameWheel, origin.height);

  wheelZoomAt(
    state,
    view.x + (origin.x + frameWheel.clientX) * view.zoom,
    view.y + (origin.y + frameWheel.clientY) * view.zoom,
    wheelZoomFactor(deltaY)
  );
};

export { applyFrameWheel };
