import type { DirectStyleProperty } from "@design-studio/contracts";

import { toFirstPart, toMaxWidth, toSideWidths } from "./border-side-model.js";
import type { BorderSide } from "./border-side-model.js";
import { strokePositionCopy } from "./copy.js";
import { toParsedNumber } from "./css-value-model.js";
import type { StyleValues } from "./css-value-model.js";
import type { NumberFieldConfig } from "./simple-model.js";

type StrokePosition = "inside" | "center" | "outside";

interface StrokePositionOption {
  readonly isDisabled: boolean;
  readonly label: string;
  readonly value: StrokePosition;
}

interface RingStroke {
  readonly classes: readonly string[];
  readonly color: string;
  readonly isInset: boolean;
  readonly width: number;
}

interface StrokeLook {
  readonly color: string;
  readonly style: string;
  readonly width: number;
}

interface ClassChange {
  readonly add: string[];
  readonly remove: string[];
}

const NO_VALUE = "";

const HALF = 2;

const RING_SHADOW_PX_RE = /calc\( ?(?<width>[\d.]+)px/u;

const RING_STEPS: ReadonlySet<string> = new Set(["0", "1", "2", "4", "8"]);

const BORDER_LOOK = [
  "border-width",
  "border-style",
  "border-color",
] as const satisfies readonly DirectStyleProperty[];

const [BORDER_WIDTH, BORDER_STYLE, BORDER_COLOR] = BORDER_LOOK;

const BORDER_PROPS: readonly DirectStyleProperty[] = [
  "border-top-width",
  "border-right-width",
  "border-bottom-width",
  "border-left-width",
  ...BORDER_LOOK,
];

const OUTLINE_PROPS = [
  "outline-style",
  "outline-width",
  "outline-color",
  "outline-offset",
] as const satisfies readonly DirectStyleProperty[];

const [OUTLINE_STYLE, OUTLINE_WIDTH_PROP, OUTLINE_COLOR, OUTLINE_OFFSET] =
  OUTLINE_PROPS;

const OUTLINE_WIDTH: NumberFieldConfig = {
  short: strokePositionCopy.width,
  spec: {
    label: strokePositionCopy.widthLabel,
    min: 0,
    prop: OUTLINE_WIDTH_PROP,
  },
};

const toPx = (raw: string): number => toParsedNumber(raw)?.value ?? 0;

const toWidthText = (width: number): string => `${width}px`;

const toCenterOffset = (width: number): string => {
  if (width === 0) {
    return "0px";
  }

  return `-${width / HALF}px`;
};

const CLASS_ATTR_RE = /^<[^>]*?\sclass="(?<names>[^"]*)"/u;

const toClassNames = (outerHTML: string): readonly string[] =>
  (CLASS_ATTR_RE.exec(outerHTML)?.groups?.names ?? NO_VALUE)
    .split(/\s+/u)
    .filter(Boolean);

const isRingClass = (name: string): boolean =>
  !name.includes(":") &&
  (name.startsWith("ring-") || name === "ring") &&
  !name.startsWith("ring-offset");

const toRingStroke = (
  outerHTML: string,
  styles: Readonly<Record<string, string>>
): RingStroke | null => {
  const shadow = (styles["--tw-ring-shadow"] ?? NO_VALUE).trim();
  const width = Number(RING_SHADOW_PX_RE.exec(shadow)?.groups?.width ?? 0);

  if (width <= 0) {
    return null;
  }

  return {
    classes: toClassNames(outerHTML).filter((name) => isRingClass(name)),
    color: styles["--tw-ring-color"]?.trim() ?? NO_VALUE,
    isInset: shadow.startsWith("inset"),
    width,
  };
};

const hasOutline = (values: StyleValues): boolean => {
  const style = values[OUTLINE_STYLE];

  return (
    toPx(values[OUTLINE_WIDTH_PROP]) > 0 &&
    style !== NO_VALUE &&
    style !== "none"
  );
};

const toStrokePosition = (
  values: StyleValues,
  ring: RingStroke | null
): StrokePosition => {
  if (ring?.isInset) {
    return "inside";
  }

  if (ring) {
    return "outside";
  }

  if (!hasOutline(values)) {
    return "inside";
  }

  if (toPx(values[OUTLINE_OFFSET]) < 0) {
    return "center";
  }

  return "outside";
};

const toStrokeLook = (
  position: StrokePosition,
  values: StyleValues,
  ring: RingStroke | null,
  dirty: readonly DirectStyleProperty[]
): StrokeLook => {
  if (ring) {
    return { color: ring.color, style: "solid", width: ring.width };
  }

  if (position === "inside") {
    return {
      color: toFirstPart(values[BORDER_COLOR]),
      style: toFirstPart(values[BORDER_STYLE]),
      width: toMaxWidth(toSideWidths(values, dirty)),
    };
  }

  return {
    color: values[OUTLINE_COLOR],
    style: values[OUTLINE_STYLE],
    width: toPx(values[OUTLINE_WIDTH_PROP]),
  };
};

const toCleared = (
  props: readonly DirectStyleProperty[],
  styleProp: DirectStyleProperty,
  isTailwind: boolean
): Partial<StyleValues> => {
  const cleared = Object.fromEntries(props.map((prop) => [prop, NO_VALUE]));

  if (isTailwind) {
    return cleared;
  }

  return { ...cleared, [styleProp]: "none" };
};

const toOffset = (next: StrokePosition, width: number): string => {
  if (next === "center") {
    return toCenterOffset(width);
  }

  return "0px";
};

const toVisibleStyle = (style: string): string => {
  if (style === NO_VALUE || style === "none" || style === "hidden") {
    return "solid";
  }

  return style;
};

const toNoOutline = (isTailwind: boolean): Partial<StyleValues> =>
  toCleared(OUTLINE_PROPS, "outline-style", isTailwind);

const toPositionPatch = (
  next: StrokePosition,
  look: StrokeLook,
  isTailwind: boolean
): Partial<StyleValues> => {
  const width = Math.max(look.width, 1);
  const style = toVisibleStyle(look.style);

  if (next === "inside") {
    return Object.fromEntries([
      ...Object.entries(toNoOutline(isTailwind)),
      [BORDER_WIDTH, toWidthText(width)],
      [BORDER_STYLE, style],
      [BORDER_COLOR, look.color],
    ]);
  }

  return Object.fromEntries([
    ...Object.entries(toCleared(BORDER_PROPS, BORDER_STYLE, isTailwind)),
    [OUTLINE_STYLE, style],
    [OUTLINE_WIDTH_PROP, toWidthText(width)],
    [OUTLINE_COLOR, look.color],
    [OUTLINE_OFFSET, toOffset(next, width)],
  ]);
};

const toCenterPatch = (patch: Partial<StyleValues>): Partial<StyleValues> => {
  const width = patch[OUTLINE_WIDTH_PROP];

  if (!width) {
    return patch;
  }

  return { ...patch, [OUTLINE_OFFSET]: toCenterOffset(toPx(width)) };
};

const toRingWidthClass = (width: number): string => {
  const whole = Math.round(Math.max(width, 0));

  if (whole === width && RING_STEPS.has(`${whole}`)) {
    return `ring-${whole}`;
  }

  return `ring-[${toWidthText(Math.max(width, 0))}]`;
};

const toRingColorClass = (color: string): string =>
  `ring-[${color.trim().replaceAll(/\s+/gu, "_")}]`;

const toChangedStyle = (
  patch: Partial<StyleValues>,
  values: StyleValues
): Partial<StyleValues> => {
  const current = new Map(Object.entries(values));

  return Object.fromEntries(
    Object.entries(patch).filter(
      ([prop, value]) => value === NO_VALUE || value !== current.get(prop)
    )
  );
};

const toRingRemoval = (ring: RingStroke): ClassChange => ({
  add: [],
  remove: [...ring.classes],
});

const toStrokePositionOptions = (
  isAllSides: boolean
): readonly StrokePositionOption[] => [
  { isDisabled: false, label: strokePositionCopy.inside, value: "inside" },
  {
    isDisabled: !isAllSides,
    label: strokePositionCopy.center,
    value: "center",
  },
  {
    isDisabled: !isAllSides,
    label: strokePositionCopy.outside,
    value: "outside",
  },
];

const toPositionTip = (isAllSides: boolean): string | null => {
  if (isAllSides) {
    return null;
  }

  return strokePositionCopy.sidesTip;
};

const toRingWidthText = (width: number): string => `${width}`;

const toShownSide = (side: BorderSide, isInside: boolean): BorderSide => {
  if (isInside) {
    return side;
  }

  return "all";
};

const isStrokePosition = (value: string): value is StrokePosition =>
  value === "inside" || value === "center" || value === "outside";

export {
  OUTLINE_WIDTH,
  hasOutline,
  isStrokePosition,
  toCenterPatch,
  toChangedStyle,
  toNoOutline,
  toPositionPatch,
  toPositionTip,
  toRingColorClass,
  toRingRemoval,
  toRingStroke,
  toRingWidthClass,
  toRingWidthText,
  toShownSide,
  toStrokeLook,
  toStrokePosition,
  toStrokePositionOptions,
};

export type { ClassChange, RingStroke, StrokeLook, StrokePosition };
