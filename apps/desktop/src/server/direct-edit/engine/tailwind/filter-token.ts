import type { TailwindTheme } from "./theme-model.js";
import { percent, plainNumber } from "./units.js";

const PERCENT_SCALE = 100;
const FULL_GRAYSCALE = 100;
const EPSILON = 0.01;

const THEME_V4 = 4;
const HUE_ROTATE = "hue-rotate";

const toSteps = (text: string): Set<number> =>
  new Set(text.split(" ").map(Number));

const V3_FILTER_STEPS = new Map([
  ["brightness", toSteps("0 50 75 90 95 100 105 110 125 150 200")],
  ["contrast", toSteps("0 50 75 100 125 150 200")],
  [HUE_ROTATE, toSteps("0 15 30 60 90 180")],
  ["saturate", toSteps("0 50 100 150 200")],
]);

const FILTER_CALL =
  /^(?<name>brightness|contrast|saturate|grayscale|hue-rotate)\((?<arg>[^()]+)\)$/u;

const DEGREES = /^(?<amount>-?\d+(?:\.\d+)?)deg$/u;

const toFilterAmount = (name: string, arg: string): number | null => {
  const text = arg.trim();

  if (name === HUE_ROTATE) {
    const degrees = DEGREES.exec(text)?.groups?.amount;

    if (!degrees) {
      return null;
    }

    return Number(degrees);
  }

  const pct = percent(text);

  if (pct !== null) {
    return pct;
  }

  return (plainNumber(text) ?? Number.NaN) * PERCENT_SCALE;
};

const toGrayscaleToken = (size: number, theme: TailwindTheme): string => {
  if (size === FULL_GRAYSCALE) {
    return "grayscale";
  }

  if (size === 0 || theme.version === THEME_V4) {
    return `grayscale-${size}`;
  }

  return `grayscale-[${size / PERCENT_SCALE}]`;
};

const toFilterScaleToken = (
  name: string,
  amount: number,
  theme: TailwindTheme
): string | null => {
  const whole = Math.round(amount);

  if (!Number.isFinite(amount) || Math.abs(amount - whole) > EPSILON) {
    return null;
  }

  let sign = "";

  if (whole < 0) {
    sign = "-";
  }

  const size = Math.abs(whole);

  const isScale =
    theme.version === THEME_V4 || V3_FILTER_STEPS.get(name)?.has(size);

  if (name === "grayscale") {
    return toGrayscaleToken(size, theme);
  }

  if (name === HUE_ROTATE) {
    if (isScale) {
      return `${sign}hue-rotate-${size}`;
    }

    return `${sign}hue-rotate-[${size}deg]`;
  }

  if (isScale) {
    return `${name}-${size}`;
  }

  return `${name}-[${size / PERCENT_SCALE}]`;
};

const toSingleFilterToken = (
  value: string,
  theme: TailwindTheme
): string | null => {
  const call = FILTER_CALL.exec(value.trim())?.groups;

  if (!call) {
    return null;
  }

  const name = call.name ?? "";
  const amount = toFilterAmount(name, call.arg ?? "");

  if (amount === null) {
    return null;
  }

  return toFilterScaleToken(name, amount, theme);
};

const toFilterToken = (value: string, theme: TailwindTheme): string => {
  const text = value.trim();

  if (text === "none") {
    return "filter-none";
  }

  const scale = toSingleFilterToken(text, theme);

  if (scale !== null) {
    return scale;
  }

  const body = text
    .replaceAll(/\s+/gu, "_")
    .replaceAll("_,", ",")
    .replaceAll(",_", ",");

  return `[filter:${body}]`;
};

export { toFilterToken };
