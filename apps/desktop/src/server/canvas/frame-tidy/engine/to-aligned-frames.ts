import { CANVAS_MAX_COORD } from "@design-studio/contracts/canvas-file";

import type { TidyBox, TidyPlace } from "./to-tidy-frames.js";

type AlignLayout =
  | "left"
  | "center"
  | "right"
  | "top"
  | "middle"
  | "bottom"
  | "spread-x"
  | "spread-y";

type SpreadLayout = "spread-x" | "spread-y";

interface AlignBounds {
  readonly bottom: number;
  readonly left: number;
  readonly right: number;
  readonly top: number;
}

const ALIGN_LAYOUTS: readonly AlignLayout[] = [
  "left",
  "center",
  "right",
  "top",
  "middle",
  "bottom",
  "spread-x",
  "spread-y",
];

const ALIGN_MIN_FRAMES = 2;

const SPREAD_MIN_FRAMES = 3;

const HALF = 2;

const toClamped = (value: number): number =>
  Math.max(-CANVAS_MAX_COORD, Math.min(CANVAS_MAX_COORD, Math.round(value)));

const isAlignLayout = (layout: string): layout is AlignLayout =>
  ALIGN_LAYOUTS.some((item) => item === layout);

const isSpreadLayout = (layout: AlignLayout): layout is SpreadLayout =>
  layout === "spread-x" || layout === "spread-y";

const toAlignMinFrames = (layout: AlignLayout): number => {
  if (isSpreadLayout(layout)) {
    return SPREAD_MIN_FRAMES;
  }

  return ALIGN_MIN_FRAMES;
};

const toBounds = (boxes: readonly TidyBox[]): AlignBounds => ({
  bottom: Math.max(...boxes.map((box) => box.y + box.height)),
  left: Math.min(...boxes.map((box) => box.x)),
  right: Math.max(...boxes.map((box) => box.x + box.width)),
  top: Math.min(...boxes.map((box) => box.y)),
});

const toAlignedX = (
  box: TidyBox,
  layout: AlignLayout,
  bounds: AlignBounds
): number => {
  if (layout === "left") {
    return bounds.left;
  }

  if (layout === "right") {
    return bounds.right - box.width;
  }

  if (layout === "center") {
    return (bounds.left + bounds.right) / HALF - box.width / HALF;
  }

  return box.x;
};

const toAlignedY = (
  box: TidyBox,
  layout: AlignLayout,
  bounds: AlignBounds
): number => {
  if (layout === "top") {
    return bounds.top;
  }

  if (layout === "bottom") {
    return bounds.bottom - box.height;
  }

  if (layout === "middle") {
    return (bounds.top + bounds.bottom) / HALF - box.height / HALF;
  }

  return box.y;
};

const toByCenterX = (left: TidyBox, right: TidyBox): number =>
  left.x + left.width / HALF - (right.x + right.width / HALF) ||
  left.y - right.y;

const toByCenterY = (left: TidyBox, right: TidyBox): number =>
  left.y + left.height / HALF - (right.y + right.height / HALF) ||
  left.x - right.x;

const toSpreadX = (boxes: readonly TidyBox[]): TidyPlace[] => {
  const ordered = boxes.toSorted(toByCenterX);
  const [first] = ordered;
  const last = ordered.at(-1);

  if (!first || !last) {
    return [];
  }

  const sizes = ordered.reduce((sum, box) => sum + box.width, 0);
  const span = last.x + last.width - first.x;
  const gap = (span - sizes) / (ordered.length - 1);
  const places: TidyPlace[] = [];
  let left = first.x;

  for (const box of ordered) {
    places.push({ id: box.id, x: toClamped(left), y: box.y });
    left += box.width + gap;
  }

  return places;
};

const toSpreadY = (boxes: readonly TidyBox[]): TidyPlace[] => {
  const ordered = boxes.toSorted(toByCenterY);
  const [first] = ordered;
  const last = ordered.at(-1);

  if (!first || !last) {
    return [];
  }

  const sizes = ordered.reduce((sum, box) => sum + box.height, 0);
  const span = last.y + last.height - first.y;
  const gap = (span - sizes) / (ordered.length - 1);
  const places: TidyPlace[] = [];
  let top = first.y;

  for (const box of ordered) {
    places.push({ id: box.id, x: box.x, y: toClamped(top) });
    top += box.height + gap;
  }

  return places;
};

const toAlignedFrames = (
  boxes: readonly TidyBox[],
  layout: AlignLayout
): TidyPlace[] => {
  if (boxes.length < toAlignMinFrames(layout)) {
    return [];
  }

  if (layout === "spread-x") {
    return toSpreadX(boxes);
  }

  if (layout === "spread-y") {
    return toSpreadY(boxes);
  }

  const bounds = toBounds(boxes);

  return boxes.map((box) => ({
    id: box.id,
    x: toClamped(toAlignedX(box, layout, bounds)),
    y: toClamped(toAlignedY(box, layout, bounds)),
  }));
};

export { isAlignLayout, toAlignMinFrames, toAlignedFrames };

export type { AlignLayout };
