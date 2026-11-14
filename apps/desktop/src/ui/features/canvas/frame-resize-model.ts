import {
  CANVAS_MAX_HEIGHT,
  CANVAS_MAX_SIDE,
} from "@design-studio/contracts/canvas-file";
import type { CanvasGuide } from "@design-studio/contracts/canvas-file";

import { RESIZE_MIN, shownFrames } from "./canvas-frame-ops.js";
import type { Box, CanvasLayout } from "./canvas-frames-model.js";
import type { FrameSnapView } from "./frame-snap-store.js";
import type { ResizeEdge } from "./resize-edge-model.js";
import { snapToGuides, toGuideMarks } from "./ruler-guide-model.js";
import { snapRect } from "./snap-model.js";

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
  readonly lines: readonly CanvasGuide[];
  readonly zoom: number;
  readonly isOff: boolean;
}

const otherFrames = (layout: CanvasLayout, id: string): Box[] =>
  shownFrames(layout).filter((canvasFrame) => canvasFrame.id !== id);

const clampSide = (value: number, max: number): number =>
  Math.round(Math.min(max, Math.max(RESIZE_MIN, value)));

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

  return {
    height: clampSide(sized.height, CANVAS_MAX_HEIGHT),
    width: clampSide(sized.width, CANVAS_MAX_SIDE),
  };
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
  const isEmpty = context.candidates.length === 0 && context.lines.length === 0;

  if (context.isOff || isEmpty) {
    return { size, view: null };
  }

  const kinds = {
    x: toSnapAxis(edge === "bottom"),
    y: toSnapAxis(edge === "right"),
  };

  const lined = snapToGuides({
    lines: context.lines,
    rect: { x: frame.x, y: frame.y, ...size },
    zoom: context.zoom,
    ...kinds,
  });

  const res = snapRect({
    candidates: context.candidates,
    rect: lined.rect,
    x: lined.x,
    y: lined.y,
    zoom: context.zoom,
  });

  const view: FrameSnapView = {
    guides: [...res.guides, ...toGuideMarks(res.rect, context.lines, kinds)],
    shift: { x: 0, y: 0 },
    spacing: [],
  };

  return {
    size: {
      height: clampSide(res.rect.height, CANVAS_MAX_HEIGHT),
      width: clampSide(res.rect.width, CANVAS_MAX_SIDE),
    },
    view,
  };
};

export { otherFrames, resizedSize, snapSize };

export type { ResizeDelta, Size, SnapContext };
