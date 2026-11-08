import { RESIZE_MIN, shownFrames } from "./canvas-frame-ops.js";
import type { Box, CanvasLayout } from "./canvas-frames-model.js";
import type { FrameSnapView } from "./frame-snap-store.js";
import type { ResizeEdge } from "./resize-edge-model.js";
import { snapRect } from "./snap-model.js";

const MAX_SIDE = 4000;

interface Size {
  readonly width: number;
  readonly height: number;
}

interface ResizeDelta {
  readonly dx: number;
  readonly dy: number;
  readonly keepRatio: boolean;
}

interface SnapResult {
  readonly view: FrameSnapView | null;
  readonly size: Size;
}

interface SnapContext {
  readonly candidates: Box[];
  readonly zoom: number;
  readonly isOff: boolean;
}

const otherFrames = (layout: CanvasLayout, id: string): Box[] =>
  shownFrames(layout).filter((canvasFrame) => canvasFrame.id !== id);

const clampSide = (value: number): number =>
  Math.round(Math.min(MAX_SIDE, Math.max(RESIZE_MIN, value)));

const toRatioSize = (
  start: Size,
  edge: ResizeEdge,
  delta: ResizeDelta,
  raw: Size
): Size => {
  const ratio = start.width / start.height;
  let { width, height } = raw;

  if (edge === "bottom") {
    width = height * ratio;
  } else if (edge === "right") {
    height = width / ratio;
  } else if (
    Math.abs(delta.dx) * start.height >=
    Math.abs(delta.dy) * start.width
  ) {
    height = width / ratio;
  } else {
    width = height * ratio;
  }

  const scale = Math.max(1, RESIZE_MIN / width, RESIZE_MIN / height);

  return { height: height * scale, width: width * scale };
};

const toSide = (start: number, delta: number, isLocked: boolean): number => {
  if (isLocked) {
    return start;
  }

  return start + delta;
};

const resizedSize = (
  start: Size,
  edge: ResizeEdge,
  delta: ResizeDelta
): Size => {
  let sized: Size = {
    height: toSide(start.height, delta.dy, edge === "right"),
    width: toSide(start.width, delta.dx, edge === "bottom"),
  };

  if (delta.keepRatio) {
    sized = toRatioSize(start, edge, delta, sized);
  }

  return { height: clampSide(sized.height), width: clampSide(sized.width) };
};

const toSnapAxis = (isLocked: boolean): "end" | null => {
  if (isLocked) {
    return null;
  }

  return "end";
};

const snapSize = (
  frame: Box,
  edge: ResizeEdge,
  size: Size,
  context: SnapContext
): SnapResult => {
  if (context.isOff || context.candidates.length === 0) {
    return { size, view: null };
  }

  const res = snapRect({
    candidates: context.candidates,
    rect: { x: frame.x, y: frame.y, ...size },
    x: toSnapAxis(edge === "bottom"),
    y: toSnapAxis(edge === "right"),
    zoom: context.zoom,
  });

  const view: FrameSnapView = {
    guides: res.guides,
    shift: { x: 0, y: 0 },
    spacing: [],
  };

  return {
    size: {
      height: clampSide(res.rect.height),
      width: clampSide(res.rect.width),
    },
    view,
  };
};

export { otherFrames, resizedSize, snapSize };

export type { ResizeDelta, Size, SnapContext };
