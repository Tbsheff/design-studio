import type { SelectionContext } from "@design-studio/contracts";

import { rotateHandleCopy } from "./copy.js";
import {
  toShiftedTranslate,
  toTranslateBase,
} from "./rotate-translate-model.js";
import type { TranslateBase } from "./rotate-translate-model.js";
import { SCALE_CORNERS } from "./scale-drag-model.js";
import type { ScaleCorner } from "./scale-drag-model.js";

type RotateCorner = ScaleCorner;

interface RotatePoint {
  readonly x: number;
  readonly y: number;
}

interface RotateLabel {
  readonly angle: number;
  readonly isEach: boolean;
  readonly x: number;
  readonly y: number;
}

type RotateStyle = Readonly<
  Partial<Record<"left" | "rotate" | "top" | "translate", string>>
>;

interface RotateLayer {
  readonly center: RotatePoint;
  readonly isAbsolute: boolean;
  readonly left: number;
  readonly snapX: number;
  readonly snapY: number;
  readonly top: number;
  readonly translate: TranslateBase;
}

interface RotateLayout {
  readonly center: RotatePoint;
  readonly isEach: boolean;
  readonly isTailwind: boolean;
  readonly layers: readonly RotateLayer[];
}

interface RotateLayerInput {
  readonly classes: readonly string[] | null;
  readonly target: SelectionContext;
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

interface RotateEdit {
  readonly component?: string;
  readonly selector: string;
  readonly source: SelectionContext["source"];
  readonly style: RotateStyle;
  readonly tag?: string;
}

interface GroupAngles {
  readonly angles: readonly number[];
  readonly label: number;
}

interface RotateBatchBody {
  readonly directionId: string;
  readonly edits: readonly RotateEdit[];
  readonly projectId: string;
}

const toRotateEdit = (
  target: SelectionContext,
  style: RotateStyle
): RotateEdit => ({
  selector: target.selector,
  source: target.source,
  style,
  ...toTargetFields(target),
});

const toRotateBatch = (
  ids: { readonly directionId: string; readonly projectId: string },
  list: readonly RotateEdit[]
): RotateBatchBody => ({
  directionId: ids.directionId,
  edits: list,
  projectId: ids.projectId,
});

const toGroupAngles = (
  bases: readonly RotateBase[],
  delta: number,
  isSnapped: boolean
): GroupAngles => {
  if (bases.length === 1) {
    const angle = toRotateAngle(bases[0]?.start ?? 0, delta, isSnapped);

    return { angles: [angle], label: angle };
  }

  const turn = toRotateAngle(0, delta, isSnapped);

  return {
    angles: bases.map((base) => toRotateAngle(base.start, turn, false)),
    label: turn,
  };
};

const isRotateDrag = (from: RotatePoint, to: RotatePoint): boolean =>
  Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y)) >= MIN_DRAG_PX;

const toAngleLabel = (label: RotateLabel): string => {
  const text = `${label.angle}${rotateHandleCopy.degree}`;

  if (label.isEach) {
    return `${text} ${rotateHandleCopy.each}`;
  }

  return text;
};

const SCALE_STEP_PX = 4;

const PX_UNIT = "px";

const SCALE_CLASSES = {
  left: /^-?left-(?:\d|px$)/u,
  top: /^-?top-(?:\d|px$)/u,
} as const;

const MOVED_POSITIONS: ReadonlySet<string> = new Set(["absolute", "fixed"]);

const toPx = (value: string | undefined): number | null => {
  const text = value?.trim() ?? "";

  if (!text.endsWith(PX_UNIT)) {
    return null;
  }

  const amount = Number(text.slice(0, -PX_UNIT.length));

  if (!Number.isFinite(amount)) {
    return null;
  }

  return amount;
};

const toSnapStep = (
  classes: readonly string[] | null,
  side: "left" | "top"
): number => {
  const pattern = SCALE_CLASSES[side];

  const isOnScale = (classes ?? []).some((token) =>
    pattern.test(token.split(":").at(-1) ?? "")
  );

  if (isOnScale) {
    return SCALE_STEP_PX;
  }

  return 1;
};

const toRectCenter = (rect: SelectionContext["rect"]): RotatePoint => ({
  x: rect.x + rect.width / 2,
  y: rect.y + rect.height / 2,
});

const toGroupCenter = (
  rects: readonly SelectionContext["rect"][]
): RotatePoint => {
  const lefts = rects.map((rect) => rect.x);
  const tops = rects.map((rect) => rect.y);
  const rights = rects.map((rect) => rect.x + rect.width);
  const bottoms = rects.map((rect) => rect.y + rect.height);

  return {
    x: (Math.min(...lefts) + Math.max(...rights)) / 2,
    y: (Math.min(...tops) + Math.max(...bottoms)) / 2,
  };
};

const toRotateLayer = (input: RotateLayerInput): RotateLayer => {
  const { classes, target } = input;
  const left = toPx(target.styles.left);
  const top = toPx(target.styles.top);
  const isPositioned = MOVED_POSITIONS.has(target.styles.position ?? "");

  return {
    center: toRectCenter(target.rect),
    isAbsolute: isPositioned && left !== null && top !== null,
    left: left ?? 0,
    snapX: toSnapStep(classes, "left"),
    snapY: toSnapStep(classes, "top"),
    top: top ?? 0,
    translate: toTranslateBase(target.styles.translate ?? null),
  };
};

const toRotateLayout = (
  inputs: readonly RotateLayerInput[],
  isTailwind: boolean
): RotateLayout => {
  const layers = inputs.map((input) => toRotateLayer(input));
  const hasFlow = layers.some((layer) => !layer.isAbsolute);

  return {
    center: toGroupCenter(inputs.map((input) => input.target.rect)),
    isEach: isTailwind && hasFlow,
    isTailwind,
    layers,
  };
};

const toTurnedPoint = (
  point: RotatePoint,
  center: RotatePoint,
  turn: number
): RotatePoint => {
  const radians = turn / DEGREES;
  const dx = point.x - center.x;
  const dy = point.y - center.y;

  return {
    x: center.x + dx * Math.cos(radians) - dy * Math.sin(radians),
    y: center.y + dx * Math.sin(radians) + dy * Math.cos(radians),
  };
};

const toSnapped = (value: number, step: number): number => {
  const snapped = Math.round(value / step) * step;

  if (Object.is(snapped, -0)) {
    return 0;
  }

  return snapped;
};

const toLeftStyle = (from: number, to: number): RotateStyle => {
  if (from === to) {
    return {};
  }

  return { left: `${to}${PX_UNIT}` };
};

const toTopStyle = (from: number, to: number): RotateStyle => {
  if (from === to) {
    return {};
  }

  return { top: `${to}${PX_UNIT}` };
};

const toMoveStyle = (
  layout: RotateLayout | null,
  index: number,
  turn: number
): RotateStyle => {
  const layer = layout?.layers[index] ?? null;

  if (layout === null || layer === null || layout.isEach) {
    return {};
  }

  const moved = toTurnedPoint(layer.center, layout.center, turn);
  const dx = moved.x - layer.center.x;
  const dy = moved.y - layer.center.y;

  if (layer.isAbsolute) {
    return {
      ...toLeftStyle(layer.left, toSnapped(layer.left + dx, layer.snapX)),
      ...toTopStyle(layer.top, toSnapped(layer.top + dy, layer.snapY)),
    };
  }

  const moveX = toSnapped(dx, 1);
  const moveY = toSnapped(dy, 1);

  if (moveX === 0 && moveY === 0) {
    return {};
  }

  return { translate: toShiftedTranslate(layer.translate, moveX, moveY) };
};

export {
  ROTATE_CORNERS,
  isRotateDrag,
  toAngleLabel,
  toGroupAngles,
  toMoveStyle,
  toPointerAngle,
  toPreviewRotate,
  toRotateAngle,
  toRotateBase,
  toRotateBatch,
  toRotateBody,
  toRotateEdit,
  toRotateLayout,
  toRotateValue,
};

export type {
  GroupAngles,
  RotateBase,
  RotateBatchBody,
  RotateBody,
  RotateCorner,
  RotateEdit,
  RotateLabel,
  RotateLayerInput,
  RotateLayout,
  RotatePoint,
  RotateStyle,
};
