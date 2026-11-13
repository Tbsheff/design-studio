import type { CSSProperties } from "react";

import type { ViewerFrame } from "./share-viewer-model.js";

interface CanvasView {
  readonly scale: number;
  readonly x: number;
  readonly y: number;
}

interface Bounds {
  readonly height: number;
  readonly width: number;
  readonly x: number;
  readonly y: number;
}

interface Point {
  readonly x: number;
  readonly y: number;
}

interface Pinch {
  readonly distance: number;
  readonly middle: Point;
}

const FIT_PAD = 48;

const SCALE_MIN = 0.05;

const SCALE_MAX = 4;

const HALF = 2;

const PERCENT = 100;

const toBounds = (frames: readonly ViewerFrame[]): Bounds => {
  const left = Math.min(...frames.map((frame) => frame.x));
  const top = Math.min(...frames.map((frame) => frame.y));
  const right = Math.max(...frames.map((frame) => frame.x + frame.width));
  const bottom = Math.max(...frames.map((frame) => frame.y + frame.height));

  return { height: bottom - top, width: right - left, x: left, y: top };
};

const toClampedScale = (scale: number): number =>
  Math.min(SCALE_MAX, Math.max(SCALE_MIN, scale));

const toFitView = (
  frames: readonly ViewerFrame[],
  width: number,
  height: number
): CanvasView => {
  if (frames.length === 0 || width <= 0 || height <= 0) {
    return { scale: 1, x: 0, y: 0 };
  }

  const box = toBounds(frames);

  const scale = toClampedScale(
    Math.min(
      (width - FIT_PAD * HALF) / box.width,
      (height - FIT_PAD * HALF) / box.height,
      1
    )
  );

  return {
    scale,
    x: (width - box.width * scale) / HALF - box.x * scale,
    y: (height - box.height * scale) / HALF - box.y * scale,
  };
};

const toZoomedView = (
  view: CanvasView,
  factor: number,
  pointX: number,
  pointY: number
): CanvasView => {
  const scale = toClampedScale(view.scale * factor);
  const ratio = scale / view.scale;

  return {
    scale,
    x: pointX - (pointX - view.x) * ratio,
    y: pointY - (pointY - view.y) * ratio,
  };
};

const toDistance = (points: readonly Point[]): number => {
  const [first, second] = points;

  if (!first || !second) {
    return 0;
  }

  return Math.hypot(first.x - second.x, first.y - second.y);
};

const toMiddle = (points: readonly Point[]): Point => {
  const [first, second] = points;

  if (!first || !second) {
    return first ?? { x: 0, y: 0 };
  }

  return { x: (first.x + second.x) / HALF, y: (first.y + second.y) / HALF };
};

const toLocalPoint = (
  element: HTMLElement,
  clientX: number,
  clientY: number
): Point => {
  const box = element.getBoundingClientRect();

  return { x: clientX - box.left, y: clientY - box.top };
};

const toPinchView = (
  view: CanvasView,
  last: Pinch,
  next: Pinch
): CanvasView => {
  const factor = next.distance / Math.max(1, last.distance);
  const zoomed = toZoomedView(view, factor, next.middle.x, next.middle.y);

  return {
    ...zoomed,
    x: zoomed.x + next.middle.x - last.middle.x,
    y: zoomed.y + next.middle.y - last.middle.y,
  };
};

const toWorldStyle = (view: CanvasView): CSSProperties => ({
  transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
});

const toZoomText = (scale: number): string => `${Math.round(scale * PERCENT)}%`;

export {
  toDistance,
  toFitView,
  toLocalPoint,
  toMiddle,
  toPinchView,
  toWorldStyle,
  toZoomedView,
  toZoomText,
};

export type { CanvasView, Pinch, Point };
