import { clampChroma, formatHex, oklch, wcagContrast } from "culori";

interface ReadableSpec {
  readonly against: readonly string[];
  readonly chroma: number;
  readonly hue: number;
  readonly minimum: number;
  readonly start: number;
  readonly step: number;
}

const FULL_TURN = 360;

const LIGHTNESS_MIN = 0.05;

const LIGHTNESS_MAX = 0.99;

const MAX_STEPS = 80;

const toHue = (hue: number): number =>
  ((hue % FULL_TURN) + FULL_TURN) % FULL_TURN;

const toHex = (lightness: number, chroma: number, hue: number): string => {
  const clamped = clampChroma(
    `oklch(${lightness} ${chroma} ${toHue(hue)})`,
    "oklch"
  );

  return formatHex(clamped) ?? "#808080";
};

const toContrast = (first: string, second: string): number =>
  wcagContrast(first, second);

const toWorstContrast = (color: string, against: readonly string[]): number =>
  Math.min(...against.map((other) => toContrast(color, other)));

const toReadable = (spec: ReadableSpec): string => {
  let lightness = spec.start;
  let color = toHex(lightness, spec.chroma, spec.hue);

  for (let step = 0; step < MAX_STEPS; step += 1) {
    if (toWorstContrast(color, spec.against) >= spec.minimum) {
      return color;
    }

    const next = lightness + spec.step;

    if (next < LIGHTNESS_MIN || next > LIGHTNESS_MAX) {
      return color;
    }

    lightness = next;
    color = toHex(lightness, spec.chroma, spec.hue);
  }

  return color;
};

const toBestText = (surface: string, light: string, dark: string): string => {
  if (toContrast(light, surface) >= toContrast(dark, surface)) {
    return light;
  }

  return dark;
};

const toHueOf = (color: string): number | null => {
  const hue = oklch(color)?.h ?? null;

  if (hue === null || Number.isNaN(hue)) {
    return null;
  }

  return hue;
};

export { toBestText, toContrast, toHex, toHue, toHueOf, toReadable };
