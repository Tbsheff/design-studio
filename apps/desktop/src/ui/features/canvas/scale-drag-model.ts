import type { SelectionContext } from "@design-studio/contracts";

import { scaleCopy } from "./copy.js";

type ScaleCorner = "nw" | "ne" | "sw" | "se";

interface ScaleRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

interface ScaleDelta {
  readonly dx: number;
  readonly dy: number;
}

interface ScaleGhost {
  readonly percent: number;
  readonly rect: ScaleRect;
  readonly selector: string;
}

const SCALE_CORNERS: readonly ScaleCorner[] = ["nw", "ne", "sw", "se"];

const FULL_PERCENT = 100;

const MIN_PERCENT = 25;

const MAX_PERCENT = 400;

const MIN_DRAG_PX = 2;

const isScaleCorner = (edge: string): edge is ScaleCorner =>
  SCALE_CORNERS.some((corner) => corner === edge);

const toScaleLayerId = (selection: SelectionContext): string | null => {
  const { source } = selection;

  if (source === null) {
    return null;
  }

  return `${source.file}:${source.line}:${source.col}`;
};

const toSignX = (corner: ScaleCorner): number => {
  if (corner === "nw" || corner === "sw") {
    return -1;
  }

  return 1;
};

const toSignY = (corner: ScaleCorner): number => {
  if (corner === "nw" || corner === "ne") {
    return -1;
  }

  return 1;
};

const toClampedPercent = (percent: number): number =>
  Math.min(MAX_PERCENT, Math.max(MIN_PERCENT, Math.round(percent)));

const toScalePercent = (
  base: ScaleRect,
  corner: ScaleCorner,
  delta: ScaleDelta
): number => {
  const width = base.width + toSignX(corner) * delta.dx;
  const height = base.height + toSignY(corner) * delta.dy;
  const weight = base.width * base.width + base.height * base.height;

  if (weight <= 0) {
    return FULL_PERCENT;
  }

  const factor = (width * base.width + height * base.height) / weight;

  return toClampedPercent(factor * FULL_PERCENT);
};

const toGhostRect = (
  base: ScaleRect,
  corner: ScaleCorner,
  percent: number
): ScaleRect => {
  const width = (base.width * percent) / FULL_PERCENT;
  const height = (base.height * percent) / FULL_PERCENT;
  let { x, y } = base;

  if (toSignX(corner) < 0) {
    x = base.x + base.width - width;
  }

  if (toSignY(corner) < 0) {
    y = base.y + base.height - height;
  }

  return { height, width, x, y };
};

const isScaleDrag = (screen: ScaleDelta): boolean =>
  Math.max(Math.abs(screen.dx), Math.abs(screen.dy)) >= MIN_DRAG_PX;

const toScaleLabel = (percent: number): string =>
  `${percent}${scaleCopy.percent}`;

export {
  FULL_PERCENT,
  SCALE_CORNERS,
  isScaleCorner,
  isScaleDrag,
  toGhostRect,
  toScaleLabel,
  toScaleLayerId,
  toScalePercent,
};

export type { ScaleCorner, ScaleDelta, ScaleGhost, ScaleRect };
