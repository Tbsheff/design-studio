import type { DirectStyleProperty } from "@design-studio/contracts";
import type { BorderSideWidth } from "@design-studio/contracts/border-side-properties";

import { borderSideCopy } from "./copy.js";
import { SIDES, toBoxSides } from "./css-value-model.js";
import type { Side, StyleValues } from "./css-value-model.js";
import type { NumberFieldConfig } from "./simple-model.js";

type BorderSide = Side | "all" | "custom";

type SideWidths = Readonly<Record<Side, number>>;

interface BorderSideOption {
  readonly label: string;
  readonly value: BorderSide;
}

const NO_WIDTH = "0px";

const SHORTHAND: DirectStyleProperty = "border-width";

const LEADING_NUMBER = /^-?\d*\.?\d+/u;

const SIDE_PROPS: Readonly<Record<Side, BorderSideWidth>> = {
  bottom: "border-bottom-width",
  left: "border-left-width",
  right: "border-right-width",
  top: "border-top-width",
};

const BORDER_SIDE_OPTIONS: readonly BorderSideOption[] = [
  { label: borderSideCopy.all, value: "all" },
  { label: borderSideCopy.top, value: "top" },
  { label: borderSideCopy.right, value: "right" },
  { label: borderSideCopy.bottom, value: "bottom" },
  { label: borderSideCopy.left, value: "left" },
  { label: borderSideCopy.custom, value: "custom" },
];

const ALL_WIDTH: NumberFieldConfig = {
  short: borderSideCopy.width,
  spec: { label: borderSideCopy.widthLabel, min: 0, prop: SHORTHAND },
};

const ONE_SIDE_FIELDS: Readonly<Record<Side, NumberFieldConfig>> = {
  bottom: {
    short: borderSideCopy.width,
    spec: {
      label: borderSideCopy.bottomWidth,
      min: 0,
      prop: SIDE_PROPS.bottom,
    },
  },
  left: {
    short: borderSideCopy.width,
    spec: { label: borderSideCopy.leftWidth, min: 0, prop: SIDE_PROPS.left },
  },
  right: {
    short: borderSideCopy.width,
    spec: { label: borderSideCopy.rightWidth, min: 0, prop: SIDE_PROPS.right },
  },
  top: {
    short: borderSideCopy.width,
    spec: { label: borderSideCopy.topWidth, min: 0, prop: SIDE_PROPS.top },
  },
};

const CUSTOM_FIELDS: readonly NumberFieldConfig[] = [
  {
    short: borderSideCopy.topShort,
    spec: { label: borderSideCopy.topWidth, min: 0, prop: SIDE_PROPS.top },
  },
  {
    short: borderSideCopy.rightShort,
    spec: { label: borderSideCopy.rightWidth, min: 0, prop: SIDE_PROPS.right },
  },
  {
    short: borderSideCopy.bottomShort,
    spec: {
      label: borderSideCopy.bottomWidth,
      min: 0,
      prop: SIDE_PROPS.bottom,
    },
  },
  {
    short: borderSideCopy.leftShort,
    spec: { label: borderSideCopy.leftWidth, min: 0, prop: SIDE_PROPS.left },
  },
];

const NO_BORDER: Partial<StyleValues> = {
  "border-bottom-width": NO_WIDTH,
  "border-left-width": NO_WIDTH,
  "border-right-width": NO_WIDTH,
  "border-style": "none",
  "border-top-width": NO_WIDTH,
  "border-width": NO_WIDTH,
};

const toPx = (raw: string): number =>
  Number(LEADING_NUMBER.exec(raw.trim())?.[0] ?? "0");

const toSideWidth = (
  side: Side,
  values: StyleValues,
  dirty: readonly DirectStyleProperty[]
): number => {
  const prop = SIDE_PROPS[side];
  const longhand = values[prop];

  const isShorthandNewer = dirty.includes(SHORTHAND) && !dirty.includes(prop);

  if (longhand && !isShorthandNewer) {
    return toPx(longhand);
  }

  return toPx(toBoxSides(values[SHORTHAND])[side]);
};

const toSideWidths = (
  values: StyleValues,
  dirty: readonly DirectStyleProperty[]
): SideWidths => ({
  bottom: toSideWidth("bottom", values, dirty),
  left: toSideWidth("left", values, dirty),
  right: toSideWidth("right", values, dirty),
  top: toSideWidth("top", values, dirty),
});

const toMaxWidth = (widths: SideWidths): number =>
  Math.max(...SIDES.map((side) => widths[side]));

const toBorderSide = (widths: SideWidths): BorderSide => {
  const isEven = SIDES.every((side) => widths[side] === widths.top);

  if (isEven) {
    return "all";
  }

  const drawn = SIDES.filter((side) => widths[side] > 0);
  const [only] = drawn;

  if (only && drawn.length === 1) {
    return only;
  }

  return "custom";
};

const toShownSide = (
  picked: BorderSide | null,
  derived: BorderSide
): BorderSide => {
  if (picked === "custom") {
    return picked;
  }

  return derived;
};

const isBorderSide = (value: string): value is BorderSide =>
  BORDER_SIDE_OPTIONS.some((option) => option.value === value);

const toWidthText = (width: number): string => `${width}px`;

const toOneSideWidth = (side: Side, next: Side, width: string): string => {
  if (side === next) {
    return width;
  }

  return NO_WIDTH;
};

const toOneSidePatch = (
  next: Side,
  width: string,
  dirty: readonly DirectStyleProperty[]
): Partial<StyleValues> => {
  const patch: Partial<StyleValues> = {
    "border-bottom-width": toOneSideWidth("bottom", next, width),
    "border-left-width": toOneSideWidth("left", next, width),
    "border-right-width": toOneSideWidth("right", next, width),
    "border-top-width": toOneSideWidth("top", next, width),
  };

  if (!dirty.includes(SHORTHAND)) {
    return patch;
  }

  return {
    ...patch,
    "border-width": SIDES.map((side) => toOneSideWidth(side, next, width)).join(
      " "
    ),
  };
};

const toAllPatch = (
  width: string,
  dirty: readonly DirectStyleProperty[]
): Partial<StyleValues> => {
  const stale = SIDES.filter((side) => dirty.includes(SIDE_PROPS[side]));

  return {
    "border-width": width,
    ...Object.fromEntries(stale.map((side) => [SIDE_PROPS[side], width])),
  };
};

const toSidePatch = (
  next: BorderSide,
  widths: SideWidths,
  dirty: readonly DirectStyleProperty[]
): Partial<StyleValues> | null => {
  const width = toWidthText(Math.max(toMaxWidth(widths), 1));

  if (next === "custom") {
    return null;
  }

  if (next === "all") {
    return toAllPatch(width, dirty);
  }

  return toOneSidePatch(next, width, dirty);
};

const toWidthFields = (side: BorderSide): readonly NumberFieldConfig[] => {
  if (side === "custom") {
    return CUSTOM_FIELDS;
  }

  if (side === "all") {
    return [ALL_WIDTH];
  }

  return [ONE_SIDE_FIELDS[side]];
};

const toStyleCellClass = (side: BorderSide): string => {
  if (side === "custom") {
    return "";
  }

  return "wide";
};

export {
  BORDER_SIDE_OPTIONS,
  NO_BORDER,
  isBorderSide,
  toBorderSide,
  toMaxWidth,
  toShownSide,
  toSidePatch,
  toSideWidths,
  toStyleCellClass,
  toWidthFields,
};

export type { BorderSide, SideWidths };
