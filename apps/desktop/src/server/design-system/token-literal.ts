import type { TokenType } from "@design-studio/contracts";
import { clampChroma, converter, formatHex, formatHex8, parse } from "culori";

interface OklchText {
  readonly css: string;
  readonly hex: string;
}

const UNSAFE_VALUE = /[;{}<>\\]/u;

const DIMENSION =
  /^(?:0|-?(?:\d+(?:\.\d*)?|\.\d+)(?:px|rem|em|%|vh|vw|vmin|vmax|ch|ex|lh|rlh))$/u;

const CSS_MATH = /^(?:calc|clamp|min|max)\([A-Za-z0-9 .,%+*/()-]+\)$/u;

const NUMBER = /^-?(?:\d+(?:\.\d*)?|\.\d+)$/u;

const DURATION = /^(?:\d+(?:\.\d*)?|\.\d+)(?:ms|s)$/u;

const FONT_WEIGHT_KEYWORDS = new Set(["normal", "bold", "lighter", "bolder"]);

const FONT_WEIGHT_MIN = 1;

const FONT_WEIGHT_MAX = 1000;

const PERCENT = 100;

const LIGHTNESS_PLACES = 2;

const CHROMA_PLACES = 4;

const HUE_PLACES = 2;

const ALPHA_PLACES = 3;

const toOklch = converter("oklch");

const toRounded = (value: number, places: number): string =>
  String(Number(value.toFixed(places)));

const toAlphaText = (alpha: number): string => {
  if (alpha < 1) {
    return ` / ${toRounded(alpha, ALPHA_PLACES)}`;
  }

  return "";
};

const toOklchText = (value: string): OklchText | null => {
  const parsed = parse(value);

  if (!parsed) {
    return null;
  }

  const color = toOklch(parsed);
  const alpha = color.alpha ?? 1;
  let hue = 0;

  if (Number.isFinite(color.h ?? Number.NaN)) {
    hue = color.h ?? 0;
  }

  const lightness = toRounded(color.l * PERCENT, LIGHTNESS_PLACES);
  const chroma = toRounded(color.c, CHROMA_PLACES);
  const hueText = toRounded(hue, HUE_PLACES);
  const css = `oklch(${lightness}% ${chroma} ${hueText}${toAlphaText(alpha)})`;
  const inGamut = clampChroma(color, "oklch");

  if (alpha < 1) {
    return { css, hex: formatHex8(inGamut) };
  }

  return { css, hex: formatHex(inGamut) };
};

const isFontWeight = (value: string): boolean => {
  if (FONT_WEIGHT_KEYWORDS.has(value)) {
    return true;
  }

  const weight = Number(value);

  return (
    NUMBER.test(value) && weight >= FONT_WEIGHT_MIN && weight <= FONT_WEIGHT_MAX
  );
};

const toLiteralProblem = (type: TokenType, value: string): string | null => {
  if (UNSAFE_VALUE.test(value)) {
    return "must not contain ; { } < > or \\";
  }

  if (type === "dimension" && !DIMENSION.test(value) && !CSS_MATH.test(value)) {
    return `"${value}" is not a dimension (for example 16px or 1rem)`;
  }

  if (type === "number" && !NUMBER.test(value)) {
    return `"${value}" is not a number`;
  }

  if (type === "duration" && !DURATION.test(value)) {
    return `"${value}" is not a duration (for example 150ms)`;
  }

  if (type === "fontWeight" && !isFontWeight(value)) {
    return `"${value}" is not a font weight`;
  }

  return null;
};

const isValidLiteral = (type: TokenType, value: string): boolean => {
  if (type === "color") {
    return !UNSAFE_VALUE.test(value) && toOklchText(value) !== null;
  }

  return toLiteralProblem(type, value) === null;
};

export { isValidLiteral, toLiteralProblem, toOklchText };
