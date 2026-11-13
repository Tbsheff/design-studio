import type { TailwindTheme } from "../tailwind/theme-model.js";
import { toVisibleShadow } from "./shadow-layers.js";

const SNAP_PX = 1;

const FINE_LIMIT_PX = 4;

const FINE_STEPS = 100;

const COARSE_STEPS = 2;

const V3_SPACING_STEPS: readonly number[] =
  "0 0.5 1 1.5 2 2.5 3 3.5 4 5 6 7 8 9 10 11 12 14 16 20 24 28 32 36 40 44 48 52 56 60 64 72 80 96"
    .split(" ")
    .map(Number);

const V3_SPACING_PX = 4;

const V4_HALF_STEPS: readonly number[] = "0.5 1.5 2.5 3.5"
  .split(" ")
  .map(Number);

const V4_STEP_COUNT = 97;

const BORDER_WIDTHS: readonly number[] = "0 1 2 4 8".split(" ").map(Number);

const TAILWIND_V3 = 3;

const SPACING_PROPERTIES: ReadonlySet<string> = new Set([
  "width",
  "height",
  "line-height",
  "padding-top",
  "padding-right",
  "padding-bottom",
  "padding-left",
  "margin-top",
  "margin-right",
  "margin-bottom",
  "margin-left",
  "row-gap",
  "column-gap",
]);

const SEPARATOR = /(?<separator>[\s,]+)/u;

const ONE_PX_PATTERN = /^(?<number>-?[\d.]+)px$/u;

const toRounded = (value: number): number => {
  if (Math.abs(value) < FINE_LIMIT_PX) {
    return Math.round(value * FINE_STEPS) / FINE_STEPS;
  }

  return Math.round(value * COARSE_STEPS) / COARSE_STEPS;
};

const toSpacingCandidates = (theme: TailwindTheme): number[] => {
  const named = [...theme.spacing.values()];

  if (theme.version === TAILWIND_V3) {
    return [...V3_SPACING_STEPS.map((step) => step * V3_SPACING_PX), ...named];
  }

  const whole = Array.from(
    { length: V4_STEP_COUNT },
    (_entry, index) => index * theme.spacingPx
  );

  const halves = V4_HALF_STEPS.map((step) => step * theme.spacingPx);

  return [...whole, ...halves, ...named];
};

const toSnapCandidates = (
  property: string,
  theme: TailwindTheme
): readonly number[] => {
  if (SPACING_PROPERTIES.has(property)) {
    return toSpacingCandidates(theme);
  }

  if (property === "font-size") {
    return [...theme.text.values()];
  }

  if (property === "border-radius") {
    return [0, ...theme.radius.values()];
  }

  if (property === "border-width") {
    return BORDER_WIDTHS;
  }

  return [];
};

const toSnapped = (value: number, candidates: readonly number[]): number => {
  let best = value;
  let bestDiff = SNAP_PX;

  for (const candidate of candidates) {
    const diff = Math.abs(candidate - Math.abs(value));

    if (diff <= bestDiff) {
      best = Math.sign(value) * candidate;
      bestDiff = diff;
    }
  }

  return best;
};

const toKeptBorder = (
  property: string,
  before: number,
  after: number
): number => {
  if (property === "border-width" && before >= 1) {
    return Math.max(1, after);
  }

  return after;
};

const toPxText = (value: number): string => `${toRounded(value)}px`;

const toScaledPart = (part: string, factor: number): string => {
  const single = ONE_PX_PATTERN.exec(part);

  if (single === null) {
    return part;
  }

  return toPxText(Number(single.groups?.number ?? "") * factor);
};

const toScaledList = (computed: string, factor: number): string =>
  computed
    .split(SEPARATOR)
    .map((part) => toScaledPart(part, factor))
    .join("");

const toSourceText = (property: string, computed: string): string | null => {
  if (property === "box-shadow") {
    return toVisibleShadow(computed.trim());
  }

  return computed.trim();
};

const toScaledValue = (
  property: string,
  computed: string,
  factor: number,
  theme: TailwindTheme | null
): string | null => {
  const text = toSourceText(property, computed);

  if (text === null || !text.includes("px")) {
    return null;
  }

  const single = ONE_PX_PATTERN.exec(text);

  if (single === null) {
    return toScaledList(text, factor);
  }

  const before = Number(single.groups?.number ?? "");
  const scaled = toKeptBorder(property, before, before * factor);

  if (theme === null) {
    return toPxText(scaled);
  }

  return toPxText(toSnapped(scaled, toSnapCandidates(property, theme)));
};

export { toScaledValue };
