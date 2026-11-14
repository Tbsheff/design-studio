import type { SelectionContext } from "@design-studio/contracts";

import { rotateHandleCopy } from "./copy.js";
import { SCALE_CORNERS } from "./scale-drag-model.js";
import type { ScaleCorner } from "./scale-drag-model.js";

type RotateCorner = ScaleCorner;

interface RotatePoint {
  readonly x: number;
  readonly y: number;
}

interface RotateLabel {
  readonly angle: number;
  readonly x: number;
  readonly y: number;
}

interface RotateBody {
  readonly component?: string;
  readonly directionId: string;
  readonly projectId: string;
  readonly selector: string;
  readonly source: SelectionContext["source"];
  readonly style: { readonly rotate: string };
  readonly tag?: string;
}

interface RotateBase {
  readonly start: number;
  readonly transformAngle: number;
}

const ROTATE_CORNERS: readonly RotateCorner[] = SCALE_CORNERS;

const HALF_TURN = 180;

const FULL_TURN = 360;

const SNAP_STEP = 15;

const MIN_DRAG_PX = 2;

const DEGREES = HALF_TURN / Math.PI;

const PRECISION = 100;

const MATRIX_OPEN = "matrix(";

const DEG_UNIT = "deg";

const toRounded = (value: number): number =>
  Math.round(value * PRECISION) / PRECISION;

const toDegreesOf = (rotate: string | undefined): number => {
  const text = rotate?.trim() ?? "";

  if (!text.endsWith(DEG_UNIT)) {
    return 0;
  }

  const degrees = Number(text.slice(0, -DEG_UNIT.length));

  if (!Number.isFinite(degrees)) {
    return 0;
  }

  return degrees;
};

const toMatrixAngle = (transform: string | undefined): number => {
  const text = transform?.trim() ?? "";

  if (!text.startsWith(MATRIX_OPEN) || !text.endsWith(")")) {
    return 0;
  }

  const parts = text.slice(MATRIX_OPEN.length, -1).split(",").map(Number);
  const [scaleX = 1, skewY = 0, skewX = 0, scaleY = 1] = parts;

  if (scaleX * scaleY - skewY * skewX <= 0) {
    return 0;
  }

  return toRounded(Math.atan2(skewY, scaleX) * DEGREES);
};

const toRotateBase = (target: SelectionContext): RotateBase => {
  const rotate = toDegreesOf(target.styles.rotate);
  const transformAngle = toMatrixAngle(target.styles.transform);

  if (transformAngle === 0 || rotate === transformAngle) {
    return { start: rotate, transformAngle };
  }

  return { start: rotate + transformAngle, transformAngle };
};

const toPointerAngle = (center: RotatePoint, point: RotatePoint): number =>
  Math.atan2(point.y - center.y, point.x - center.x) * DEGREES;

const toNormalAngle = (angle: number): number => {
  const turned = ((angle % FULL_TURN) + FULL_TURN) % FULL_TURN;

  if (turned > HALF_TURN) {
    return turned - FULL_TURN;
  }

  return turned;
};

const toRotateAngle = (
  start: number,
  delta: number,
  isSnapped: boolean
): number => {
  const raw = start + delta;

  if (isSnapped) {
    return toNormalAngle(Math.round(raw / SNAP_STEP) * SNAP_STEP);
  }

  return toNormalAngle(Math.round(raw));
};

const toRotateValue = (angle: number): string => `${angle}${DEG_UNIT}`;

const toPreviewRotate = (angle: number, base: RotateBase): string =>
  toRotateValue(toRounded(angle - base.transformAngle));

const toTargetFields = (
  target: SelectionContext
): { readonly component: string } | { readonly tag: string } => {
  if (target.component) {
    return { component: target.component };
  }

  return { tag: target.tag.toLowerCase() };
};

const toRotateBody = (
  ids: { readonly directionId: string; readonly projectId: string },
  target: SelectionContext,
  style: { readonly rotate: string }
): RotateBody => ({
  directionId: ids.directionId,
  projectId: ids.projectId,
  selector: target.selector,
  source: target.source,
  style,
  ...toTargetFields(target),
});

const isRotateDrag = (from: RotatePoint, to: RotatePoint): boolean =>
  Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y)) >= MIN_DRAG_PX;

const toAngleLabel = (angle: number): string =>
  `${angle}${rotateHandleCopy.degree}`;

export {
  ROTATE_CORNERS,
  isRotateDrag,
  toAngleLabel,
  toPointerAngle,
  toPreviewRotate,
  toRotateAngle,
  toRotateBase,
  toRotateBody,
  toRotateValue,
};

export type { RotateBase, RotateBody, RotateCorner, RotateLabel, RotatePoint };
