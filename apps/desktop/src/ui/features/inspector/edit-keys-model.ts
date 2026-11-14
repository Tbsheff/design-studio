import type { TypeProp } from "../../../shared/edit-keys.js";
import { toParsedNumber } from "./css-value-model.js";
import type { StyleValues } from "./css-value-model.js";

interface DigitRun {
  readonly at: number;
  readonly digits: string;
}

const SEQUENCE_MS = 400;
const FULL_DIGIT = "0";
const FULL_OPACITY = "1";
const PERCENT = 100;
const TENTH = 10;
const PX = "px";
const EM = "em";
const NORMAL = "normal";
const NORMAL_LEADING = 1.2;
const SPACING_STEP = 0.01;
const ROUND = 1000;
const MATCH_DELTA = 0.005;
const MIN_FONT_PX = 1;

const FONT_SCALE_PX = {
  base: 16,
  lg: 18,
  sm: 14,
  xl: 20,
  xl2: 24,
  xl3: 30,
  xl4: 36,
  xl5: 48,
  xl6: 60,
  xl7: 72,
  xl8: 96,
  xl9: 128,
  xs: 12,
};

const LEADING_RATIO = {
  loose: 2,
  none: 1,
  normal: 1.5,
  relaxed: 1.625,
  snug: 1.375,
  tight: 1.25,
};

const toSortedScale = (scale: Record<string, number>): readonly number[] =>
  Object.values(scale).toSorted((left, right) => left - right);

const FONT_SCALE = toSortedScale(FONT_SCALE_PX);

const LEADING_SCALE = toSortedScale(LEADING_RATIO);

const toRounded = (value: number): number => Math.round(value * ROUND) / ROUND;

const toNextDigits = (
  previous: DigitRun | null,
  digit: string,
  now: number
): DigitRun => {
  if (
    previous !== null &&
    previous.digits.length === 1 &&
    now - previous.at <= SEQUENCE_MS
  ) {
    return { at: now, digits: `${previous.digits}${digit}` };
  }

  return { at: now, digits: digit };
};

const toOpacityValue = (digits: string): string => {
  if (digits.length > 1) {
    return String(Number(digits) / PERCENT);
  }

  if (digits === FULL_DIGIT) {
    return FULL_OPACITY;
  }

  return String(Number(digits) / TENTH);
};

const toPx = (raw: string): number | null => {
  const parsed = toParsedNumber(raw);

  if (parsed === null || parsed.unit !== PX) {
    return null;
  }

  return parsed.value;
};

const toScaleIndex = (scale: readonly number[], value: number): number =>
  scale.findIndex((entry) => Math.abs(entry - value) < MATCH_DELTA);

const toScaleStep = (
  scale: readonly number[],
  value: number,
  step: number
): number | null => {
  const index = toScaleIndex(scale, value);

  if (index < 0) {
    return null;
  }

  return scale[index + step] ?? null;
};

const toFontSizeValue = (
  raw: string,
  step: number,
  isTailwind: boolean
): string | null => {
  const px = toPx(raw);

  if (px === null) {
    return null;
  }

  if (isTailwind) {
    const next = toScaleStep(FONT_SCALE, px, step);

    if (next !== null) {
      return `${next}${PX}`;
    }
  }

  return `${Math.max(MIN_FONT_PX, toRounded(px + step))}${PX}`;
};

const toSpacingEm = (raw: string, fontPx: number): number | null => {
  if (raw === NORMAL) {
    return 0;
  }

  const parsed = toParsedNumber(raw);

  if (parsed === null) {
    return null;
  }

  if (parsed.unit === EM) {
    return parsed.value;
  }

  if (parsed.unit === PX && fontPx > 0) {
    return parsed.value / fontPx;
  }

  return null;
};

const toLetterSpacingValue = (
  raw: string,
  fontPx: number,
  step: number
): string | null => {
  const em = toSpacingEm(raw, fontPx);

  if (em === null) {
    return null;
  }

  return `${toRounded(em + step * SPACING_STEP)}${EM}`;
};

const toLineHeightPx = (raw: string, fontPx: number): number | null => {
  if (raw === NORMAL) {
    return Math.round(fontPx * NORMAL_LEADING);
  }

  const parsed = toParsedNumber(raw);

  if (parsed === null) {
    return null;
  }

  if (parsed.unit === "") {
    return parsed.value * fontPx;
  }

  if (parsed.unit === PX) {
    return parsed.value;
  }

  return null;
};

const toLineHeightValue = (
  raw: string,
  fontPx: number,
  step: number,
  isTailwind: boolean
): string | null => {
  const px = toLineHeightPx(raw, fontPx);

  if (px === null) {
    return null;
  }

  if (isTailwind && fontPx > 0) {
    const next = toScaleStep(LEADING_SCALE, px / fontPx, step);

    if (next !== null) {
      return String(next);
    }
  }

  return `${Math.max(0, Math.round(px) + step)}${PX}`;
};

const toTypeValue = (
  prop: TypeProp,
  values: StyleValues,
  step: number,
  isTailwind: boolean
): string | null => {
  const fontPx = toPx(values["font-size"]) ?? 0;

  if (prop === "font-size") {
    return toFontSizeValue(values["font-size"], step, isTailwind);
  }

  if (prop === "letter-spacing") {
    return toLetterSpacingValue(values["letter-spacing"], fontPx, step);
  }

  return toLineHeightValue(values["line-height"], fontPx, step, isTailwind);
};

export { SEQUENCE_MS, toNextDigits, toOpacityValue, toTypeValue };

export type { DigitRun };
