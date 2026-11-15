import { toCorners } from "./corners-model.js";
import { SIDES, toNumberText, toParsedNumber } from "./css-value-model.js";
import type { ShiftPart } from "./css-value-model.js";

const SMOOTHING_PROP = "corner-shape" as const;
const SMOOTHING_SLOT = "width" as const;
const SMOOTHING_SHORT = "S";
const PERCENT_UNIT = "%";
const IOS_PERCENT = 60;
const MAX_PERCENT = 100;
const PERCENT_PER_STEP = 60;
const EXPONENT_PRECISION = 100;
const SQUIRCLE = "squircle";
const SUPERELLIPSE_RE = /^superellipse\(\s*(?<exponent>[+-]?[\d.]+)\s*\)/u;

const toClampedPercent = (value: number): number =>
  Math.min(MAX_PERCENT, Math.max(0, Math.round(value)));

const toSmoothingPercent = (value: string): number => {
  const css = value.trim().toLowerCase();

  if (css.startsWith(SQUIRCLE)) {
    return IOS_PERCENT;
  }

  const exponent = Number(
    SUPERELLIPSE_RE.exec(css)?.groups?.exponent ?? Number.NaN
  );

  if (!Number.isFinite(exponent)) {
    return 0;
  }

  return toClampedPercent((exponent - 1) * PERCENT_PER_STEP);
};

const toSmoothingCss = (percent: number): string => {
  const clamped = toClampedPercent(percent);

  if (clamped === 0) {
    return "";
  }

  if (clamped === IOS_PERCENT) {
    return SQUIRCLE;
  }

  const exponent =
    Math.round((1 + clamped / PERCENT_PER_STEP) * EXPONENT_PRECISION) /
    EXPONENT_PRECISION;

  return `superellipse(${exponent})`;
};

const toSmoothingText = (percent: number): string =>
  toNumberText(percent, PERCENT_UNIT);

const toFieldText = (percent: number, isMixed: boolean): string => {
  if (isMixed) {
    return "";
  }

  return toSmoothingText(percent);
};

const fromSmoothingText = (text: string): number =>
  toParsedNumber(text)?.value ?? 0;

const toCssFromText = (text: string): string =>
  toSmoothingCss(fromSmoothingText(text));

const SMOOTHING_PART: ShiftPart = {
  key: "smoothing",
  map: (raw, change) => {
    const from = toSmoothingText(toSmoothingPercent(raw));

    return toCssFromText(change(from));
  },
};

const isCornerOn = (corner: string): boolean => {
  const parsed = toParsedNumber(corner);

  if (!parsed) {
    return corner.trim() !== "";
  }

  return parsed.value > 0;
};

const hasRadius = (radius: string): boolean => {
  const corners = toCorners(radius);

  return SIDES.some((side) => isCornerOn(corners[side]));
};

export {
  SMOOTHING_PROP,
  IOS_PERCENT,
  MAX_PERCENT,
  PERCENT_UNIT,
  SMOOTHING_PART,
  SMOOTHING_SHORT,
  SMOOTHING_SLOT,
  hasRadius,
  toSmoothingCss,
  toFieldText,
  toCssFromText,
  toSmoothingPercent,
  toSmoothingText,
};
