import type { SelectionContext } from "@design-studio/contracts";
import { targetFrame } from "@design-studio/contracts/link-interaction";
import {
  cleanLinkText,
  EASING_LABELS,
  LINK_EASINGS,
  LINK_TRANSITIONS,
  linkDuration,
  transitionLabel,
} from "@design-studio/contracts/links";
import type {
  LinkEasing,
  LinksFile,
  LinkTransition,
  PrototypeLink,
} from "@design-studio/contracts/links";
import type { UiSelectOption } from "@design-studio/ui";

import type { CanvasFrame } from "./canvas-frames-model.js";
import { framePage } from "./canvas-frames.js";
import { protoCopy } from "./proto-copy.js";

interface Point {
  readonly x: number;
  readonly y: number;
}

interface Box {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

interface LinkDrag {
  readonly from: Point;
  readonly to: Point;
  readonly target: string | null;
}

interface MotionOptions {
  readonly durations: UiSelectOption[];
  readonly easings: UiSelectOption<LinkEasing>[];
  readonly transitions: UiSelectOption<LinkTransition>[];
}

interface LinkSource {
  readonly frame: string;
  readonly path: string;
  readonly selector: string;
  readonly tag: string;
  readonly text?: string;
}

interface ArrowStroke {
  readonly path: string;
  readonly markerEnd: string;
}

const PAD = 400;
const LIFT_MIN = 120;
const LIFT_PAD = 120;
const CURVE_REACH = 80;
const REACH_MIN = 60;
const EDGE_INSET = 24;
const RECT_TOLERANCE = 1;
const DURATION_FAST = 150;
const DURATION_QUICK = 200;
const DURATION_BASE = 320;
const DURATION_SLOW = 500;
const DURATION_SLOWER = 800;
const DURATION_SLOWEST = 1200;

const DURATIONS = [
  DURATION_FAST,
  DURATION_QUICK,
  DURATION_BASE,
  DURATION_SLOW,
  DURATION_SLOWER,
  DURATION_SLOWEST,
];

const LOOP_PATH = "c 40 0, 40 -40, 0 -40";
const HEAD = "url(#link-head)";
const HEAD_BROKEN = "url(#link-head-broken)";

const hasOutgoing = (file: LinksFile, frameId: string): boolean =>
  file.links.some((link) => link.from.frame === frameId);

const playStartOf = (
  file: LinksFile,
  frames: readonly CanvasFrame[],
  startId: string
): string => {
  if (file.start || hasOutgoing(file, startId)) {
    return startId;
  }

  return (
    frames.find((frame) => !frame.hidden && hasOutgoing(file, frame.id))?.id ??
    startId
  );
};

const toProtoHint = (
  frames: readonly CanvasFrame[],
  hasSelection: boolean
): string => {
  if (new Set(frames.map((frame) => framePage(frame.path))).size < 2) {
    return protoCopy.addPageFirst;
  }

  if (hasSelection) {
    return protoCopy.dragHandle;
  }

  return protoCopy.clickElement;
};

const toBox = (frame: CanvasFrame, active: CanvasFrame): Box => ({
  height: frame.height,
  width: frame.width,
  x: frame.x - active.x,
  y: frame.y - active.y,
});

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const toStartPoint = (rect: Box | null, from: Box): Point | null => {
  if (!rect) {
    return null;
  }

  const offsetY = clamp(rect.y + rect.height / 2, 0, from.height);

  return {
    x: from.x + clamp(rect.x + rect.width, 0, from.width),
    y: from.y + offsetY,
  };
};

const toBackwardPath = (start: Point, target: Box): string => {
  const end = { x: target.x + target.width / 2, y: target.y };
  const lift = Math.max(LIFT_MIN, Math.abs(start.y - end.y) / 2 + LIFT_PAD);
  const top = Math.min(start.y, end.y) - lift;

  return `M ${start.x} ${start.y} C ${start.x + CURVE_REACH} ${top}, ${end.x} ${top}, ${end.x} ${end.y}`;
};

const toForwardPath = (start: Point, target: Box): string => {
  const end = {
    x: target.x,
    y: clamp(
      start.y,
      target.y + EDGE_INSET,
      target.y + target.height - EDGE_INSET
    ),
  };

  const reach = Math.max(REACH_MIN, (end.x - start.x) / 2);

  return `M ${start.x} ${start.y} C ${start.x + reach} ${start.y}, ${end.x - reach} ${end.y}, ${end.x} ${end.y}`;
};

const toArrowPath = (start: Point, target: Box): string => {
  if (target.x >= start.x) {
    return toForwardPath(start, target);
  }

  return toBackwardPath(start, target);
};

const toArrowStroke = (
  begin: Point,
  target: Box | null,
  isBroken: boolean
): ArrowStroke => {
  if (!target) {
    return { markerEnd: HEAD, path: `M ${begin.x} ${begin.y} ${LOOP_PATH}` };
  }

  if (isBroken) {
    return { markerEnd: HEAD_BROKEN, path: toArrowPath(begin, target) };
  }

  return { markerEnd: HEAD, path: toArrowPath(begin, target) };
};

const toBounds = (frames: CanvasFrame[], active: CanvasFrame): Box => {
  const boxes = frames.map((frame) => toBox(frame, active));
  const minX = Math.min(0, ...boxes.map((box) => box.x)) - PAD;
  const minY = Math.min(0, ...boxes.map((box) => box.y)) - PAD;

  const maxX =
    Math.max(active.width, ...boxes.map((box) => box.x + box.width)) + PAD;

  const maxY =
    Math.max(active.height, ...boxes.map((box) => box.y + box.height)) + PAD;

  return { height: maxY - minY, width: maxX - minX, x: minX, y: minY };
};

const frameUnder = (x: number, y: number, exclude: string): string | null => {
  for (const element of document.elementsFromPoint(x, y)) {
    const host = element.closest<HTMLElement>("[data-frame-id]");
    const id = host?.dataset.frameId;

    if (id && id !== exclude) {
      return id;
    }

    if (id === exclude && host?.classList.contains("artboard")) {
      return null;
    }
  }

  return null;
};

const toLinkSource = (
  selection: SelectionContext,
  frame: CanvasFrame
): LinkSource => {
  const text = cleanLinkText(selection.text);

  const source = {
    frame: frame.id,
    path: frame.path ?? "",
    selector: selection.selector,
    tag: selection.tag.toLowerCase(),
  };

  if (text) {
    return { ...source, text };
  }

  return source;
};

const isSameRect = (first: Box, second: Box): boolean =>
  Math.abs(first.x - second.x) < RECT_TOLERANCE &&
  Math.abs(first.y - second.y) < RECT_TOLERANCE &&
  Math.abs(first.width - second.width) < RECT_TOLERANCE &&
  Math.abs(first.height - second.height) < RECT_TOLERANCE;

const toMotionOptions = (link: PrototypeLink): MotionOptions => {
  const duration = linkDuration(link);
  let durations = DURATIONS;

  if (!DURATIONS.includes(duration)) {
    durations = [...DURATIONS, duration].toSorted(
      (first, second) => first - second
    );
  }

  return {
    durations: durations.map((ms) => ({
      label: `${ms} ms`,
      value: String(ms),
    })),
    easings: LINK_EASINGS.map((easing) => ({
      label: EASING_LABELS[easing],
      value: easing,
    })),
    transitions: LINK_TRANSITIONS.map((transition) => ({
      label: transitionLabel(transition),
      value: transition,
    })),
  };
};

const toTargetOptions = (
  link: PrototypeLink,
  frames: CanvasFrame[],
  toTitle: (frame: CanvasFrame) => string
): UiSelectOption[] => {
  const options = frames.filter((frame) => frame.id !== link.from.frame);
  const target = targetFrame(link.to);

  const entries = options.map((frame) => ({
    label: `${protoCopy.goTo} ${toTitle(frame)}`,
    value: frame.id,
  }));

  if (target && !options.some((frame) => frame.id === target)) {
    entries.push({ label: protoCopy.missingFrame, value: target });
  }

  entries.push({ label: protoCopy.back, value: "back" });

  return entries;
};

export {
  frameUnder,
  isSameRect,
  hasOutgoing,
  playStartOf,
  toArrowStroke,
  toBounds,
  toBox,
  toLinkSource,
  toMotionOptions,
  toProtoHint,
  toStartPoint,
  toTargetOptions,
};

export type { Box, LinkDrag, LinkSource, MotionOptions, Point };
