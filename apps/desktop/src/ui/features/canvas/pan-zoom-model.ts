import { isModZoomKey } from "@design-studio/contracts";

import { isTypingTarget } from "../../platform/typing-target.js";
import type { Box } from "./canvas-frames-model.js";

const MIN_10_000 = 10_000;

const ROUND_10_000 = 10_000;

const ZOOM_100 = 100;

const PAD = 24;
const RAIL_INSET = 24;

const FRAME_LABEL_H = 28;

const SELECTION_PAD = 64;

const MIN_ZOOM = 0.1;

const MAX_ZOOM = 4;

const ZOOM_STEP = 1.25;

const LINE_PX = 16;

const WHEEL_RATE = 0.01;

const WHEEL_IDLE_MS = 160;

const CLICK_ZOOM = 2;

const wheelZoomFactor = (dy: number): number =>
  Math.min(ZOOM_STEP, Math.max(1 / ZOOM_STEP, Math.exp(-dy * WHEEL_RATE)));

const clampZoom = (zoom: number): number =>
  Math.round(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom)) * MIN_10_000) /
  ROUND_10_000;

const fitZoomFor = (
  stageWidth: number,
  stageHeight: number,
  bounds: Box
): number => {
  if (
    stageWidth <= 0 ||
    stageHeight <= 0 ||
    bounds.width <= 0 ||
    bounds.height <= 0
  ) {
    return 1;
  }

  return Math.max(
    MIN_ZOOM,
    Math.min(
      1,
      (stageWidth - PAD * 2) / bounds.width,
      (stageHeight - PAD * 2 - FRAME_LABEL_H) / bounds.height
    )
  );
};

const fitTop = (stageHeight: number, height: number): number =>
  FRAME_LABEL_H +
  Math.max(PAD, Math.round((stageHeight - FRAME_LABEL_H - height) / 2));

const blocksZoomKey = (event: KeyboardEvent): boolean => {
  if (!isTypingTarget(event.target)) {
    return false;
  }

  return !(isModZoomKey(event) && event.target instanceof HTMLSelectElement);
};

export {
  CLICK_ZOOM,
  LINE_PX,
  RAIL_INSET,
  SELECTION_PAD,
  WHEEL_IDLE_MS,
  ZOOM_100,
  ZOOM_STEP,
  blocksZoomKey,
  clampZoom,
  fitTop,
  fitZoomFor,
  wheelZoomFactor,
};
