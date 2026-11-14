import type { CanvasGuide } from "@design-studio/contracts/canvas-file";
import type { CSSProperties } from "react";

import { SNAP_PX, snapRect, unionBox } from "./snap-model.js";
import type { Axis, Rect, SnapGuide, SnapKind } from "./snap-model.js";

const MIN_ZOOM = 0.01;

const SAME = 0.5;

const GUIDE_REACH = 100_000;

interface StageView {
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
}

interface GuideSnapInput {
  readonly rect: Rect;
  readonly lines: readonly CanvasGuide[];
  readonly x: SnapKind;
  readonly y: SnapKind;
  readonly zoom: number;
}

interface GuideSnap {
  readonly rect: Rect;
  readonly x: SnapKind;
  readonly y: SnapKind;
}

interface GuideKinds {
  readonly x: SnapKind;
  readonly y: SnapKind;
}

interface FrameGuideSnap {
  readonly at: number;
  readonly marks: SnapGuide[];
}

interface Span {
  readonly lo: number;
  readonly hi: number;
}

const toSpan = (rect: Rect, axis: Axis): Span => {
  if (axis === "x") {
    return { hi: rect.x + rect.width, lo: rect.x };
  }

  return { hi: rect.y + rect.height, lo: rect.y };
};

const toCross = (axis: Axis): Axis => {
  if (axis === "x") {
    return "y";
  }

  return "x";
};

const toPoints = (span: Span, kind: Exclude<SnapKind, null>): number[] => {
  if (kind === "end") {
    return [span.hi];
  }

  return [span.lo, (span.lo + span.hi) / 2, span.hi];
};

const toLineDelta = (
  input: GuideSnapInput,
  axis: Axis,
  kind: Exclude<SnapKind, null>
): number | null => {
  const threshold = SNAP_PX / Math.max(input.zoom, MIN_ZOOM);
  const points = toPoints(toSpan(input.rect, axis), kind);
  let best: number | null = null;

  for (const line of input.lines) {
    for (const point of points) {
      const delta = line.at - point;
      const isNear = line.axis === axis && Math.abs(delta) <= threshold;

      if (isNear && (best === null || Math.abs(delta) < Math.abs(best))) {
        best = delta;
      }
    }
  }

  return best;
};

const toShiftedRect = (
  rect: Rect,
  axis: Axis,
  kind: Exclude<SnapKind, null>,
  delta: number
): Rect => {
  if (kind === "move" && axis === "x") {
    return { ...rect, x: rect.x + delta };
  }

  if (kind === "move") {
    return { ...rect, y: rect.y + delta };
  }

  if (axis === "x") {
    return { ...rect, width: Math.max(1, rect.width + delta) };
  }

  return { ...rect, height: Math.max(1, rect.height + delta) };
};

const snapToGuides = (input: GuideSnapInput): GuideSnap => {
  let { rect } = input;
  const kinds = { x: input.x, y: input.y };

  for (const axis of ["x", "y"] as const) {
    const kind = input[axis];

    if (kind) {
      const delta = toLineDelta({ ...input, rect }, axis, kind);

      if (delta !== null) {
        rect = toShiftedRect(rect, axis, kind, delta);
        kinds[axis] = null;
      }
    }
  }

  return { rect, x: kinds.x, y: kinds.y };
};

const toGuideMarks = (
  rect: Rect,
  lines: readonly CanvasGuide[],
  kinds: { readonly x: SnapKind; readonly y: SnapKind }
): SnapGuide[] => {
  const marks: SnapGuide[] = [];

  for (const line of lines) {
    const kind = kinds[line.axis];
    const cross = toSpan(rect, toCross(line.axis));

    const isOn =
      kind !== null &&
      toPoints(toSpan(rect, line.axis), kind).some(
        (point) => Math.abs(point - line.at) < SAME
      );

    if (isOn) {
      marks.push({
        at: line.at,
        axis: line.axis,
        from: cross.lo,
        to: cross.hi,
      });
    }
  }

  return marks;
};

const toGuideRect = (guide: CanvasGuide, box: Rect): Rect => {
  if (guide.axis === "x") {
    return { ...box, width: GUIDE_REACH, x: guide.at - GUIDE_REACH };
  }

  return { ...box, height: GUIDE_REACH, y: guide.at - GUIDE_REACH };
};

const toGuideKinds = (axis: Axis): GuideKinds => {
  if (axis === "x") {
    return { x: "end", y: null };
  }

  return { x: null, y: "end" };
};

const toGuideEnd = (rect: Rect, axis: Axis): number => toSpan(rect, axis).hi;

const snapGuideToFrames = (
  guide: CanvasGuide,
  frames: Rect[],
  zoom: number
): FrameGuideSnap => {
  const box = unionBox(frames);

  if (box === null) {
    return { at: guide.at, marks: [] };
  }

  const snapped = snapRect({
    candidates: frames,
    rect: toGuideRect(guide, box),
    ...toGuideKinds(guide.axis),
    zoom,
  });

  return {
    at: Math.round(toGuideEnd(snapped.rect, guide.axis)),
    marks: snapped.guides.map((mark) => ({
      at: Math.round(mark.at),
      axis: mark.axis,
      from: mark.from,
      to: mark.to,
    })),
  };
};

const toWorld = (
  screen: number,
  view: StageView,
  origin: number,
  axis: Axis
): number => {
  if (axis === "x") {
    return Math.round(origin + (screen - view.x) / view.zoom);
  }

  return Math.round(origin + (screen - view.y) / view.zoom);
};

const toScreen = (
  guide: CanvasGuide,
  view: StageView,
  origin: { readonly x: number; readonly y: number }
): number => {
  if (guide.axis === "x") {
    return view.x + (guide.at - origin.x) * view.zoom;
  }

  return view.y + (guide.at - origin.y) * view.zoom;
};

const toMovedGuides = (
  guides: readonly CanvasGuide[],
  index: number | null,
  next: CanvasGuide | null
): CanvasGuide[] => {
  const kept = guides.filter((_guide, at) => at !== index);

  if (next === null) {
    return kept;
  }

  return [
    ...kept.filter((guide) => guide.axis !== next.axis || guide.at !== next.at),
    next,
  ];
};

const toGuideStyle = (
  guide: CanvasGuide,
  view: StageView,
  origin: { readonly x: number; readonly y: number }
): CSSProperties => {
  const at = Math.round(toScreen(guide, view, origin));

  if (guide.axis === "x") {
    return { left: at };
  }

  return { top: at };
};

const toGuideClass = (guide: CanvasGuide, isHidden: boolean): string => {
  const base = `ruler-guide ${guide.axis}`;

  if (isHidden) {
    return `${base} is-hidden`;
  }

  return base;
};

const toDragClass = (drag: {
  readonly guide: CanvasGuide;
  readonly isRemoving: boolean;
}): string => {
  const base = `ruler-guide ${drag.guide.axis} is-dragging`;

  if (drag.isRemoving) {
    return `${base} is-removing`;
  }

  return base;
};

const toLabelText = (guide: CanvasGuide): string => `${guide.axis} ${guide.at}`;

export {
  snapGuideToFrames,
  snapToGuides,
  toDragClass,
  toGuideClass,
  toGuideMarks,
  toGuideStyle,
  toLabelText,
  toMovedGuides,
  toScreen,
  toWorld,
};

export type { FrameGuideSnap, GuideSnap, GuideSnapInput, StageView };
