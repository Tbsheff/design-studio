import type { DirectStyleProperty } from "@design-studio/contracts";

import { toParsedNumber } from "./css-value-model.js";
import type { StyleValues } from "./css-value-model.js";

type StrokeSide = "inside" | "center" | "outside";

const NO_VALUE = "";

const toPx = (raw: string): number => toParsedNumber(raw)?.value ?? 0;

const toWidthText = (width: number): string => `${width}px`;

interface VariantStroke {
  readonly position: StrokeSide;
  readonly width: number;
}

interface StrokeMove {
  readonly isVariant: boolean;
  readonly next: StrokeSide;
  readonly position: StrokeSide;
  readonly width: number;
}

const RING_CLASS_RE =
  /^(?:inset-)?ring(?:-(?<size>\d+)|-\[(?<arbitrary>[\d.]+)px\])?$/u;

const RING_DEFAULT_WIDTH = 1;

const PADDING_PROPS = [
  "padding-top",
  "padding-right",
  "padding-bottom",
  "padding-left",
] as const satisfies readonly DirectStyleProperty[];

const OUTLINE_CLASS_RE =
  /^outline(?:-(?<size>\d+)|-\[(?<arbitrary>[\d.]+)px\])?$/u;

const NEGATIVE_OFFSET_RE = /^(?:-outline-offset-|outline-offset-\[-)/u;

const toVariantOutlineWidth = (bases: readonly string[]): number => {
  let width = 0;

  for (const base of bases) {
    const groups = OUTLINE_CLASS_RE.exec(base)?.groups;

    if (groups) {
      width = Number(groups.size ?? groups.arbitrary ?? RING_DEFAULT_WIDTH);
    }
  }

  return width;
};

const toBaseName = (name: string, variant: string): string | null => {
  if (variant === NO_VALUE) {
    if (name.includes(":")) {
      return null;
    }

    return name;
  }

  if (!name.startsWith(variant) || name.slice(variant.length).includes(":")) {
    return null;
  }

  return name.slice(variant.length);
};

const toVariantBases = (
  set: readonly string[],
  variant: string
): readonly string[] =>
  set.flatMap((name) => {
    const base = toBaseName(name, variant);

    if (base === null) {
      return [];
    }

    return [base];
  });

const toVariantStroke = (
  set: readonly string[],
  variant: string
): VariantStroke | null => {
  if (variant === NO_VALUE) {
    return null;
  }

  const bases = toVariantBases(set, variant);
  const width = toVariantOutlineWidth(bases);

  if (width <= 0) {
    return null;
  }

  if (bases.some((base) => NEGATIVE_OFFSET_RE.test(base))) {
    return { position: "center", width };
  }

  return { position: "outside", width };
};

const isRingBase = (base: string): boolean =>
  (base.startsWith("ring-") ||
    base === "ring" ||
    base.startsWith("inset-ring")) &&
  !base.startsWith("ring-offset");

const toClassRingWidth = (bases: readonly string[]): number => {
  for (const base of bases) {
    const groups = RING_CLASS_RE.exec(base)?.groups;

    if (groups) {
      return Number(groups.size ?? groups.arbitrary ?? RING_DEFAULT_WIDTH);
    }
  }

  return 0;
};

const toPaddingPatch = (
  values: StyleValues,
  delta: number
): Partial<StyleValues> =>
  Object.fromEntries(
    PADDING_PROPS.map((prop) => [
      prop,
      toWidthText(Math.max(toPx(values[prop]) + delta, 0)),
    ])
  );

const toPaddingDelta = (
  position: StrokeSide,
  next: StrokeSide,
  width: number
): number => {
  if (position === "inside" && next !== "inside") {
    return width;
  }

  if (position !== "inside" && next === "inside") {
    return -width;
  }

  return 0;
};

const toKeptPlacePatch = (
  patch: Partial<StyleValues>,
  values: StyleValues,
  move: StrokeMove
): Partial<StyleValues> => {
  const width = Math.max(move.width, 1);
  const delta = toPaddingDelta(move.position, move.next, width);

  if (delta === 0) {
    return patch;
  }

  if (delta < 0 && move.isVariant) {
    return {
      ...patch,
      ...Object.fromEntries(PADDING_PROPS.map((prop) => [prop, NO_VALUE])),
    };
  }

  return { ...patch, ...toPaddingPatch(values, delta) };
};

export {
  isRingBase,
  toBaseName,
  toClassRingWidth,
  toKeptPlacePatch,
  toVariantStroke,
};

export type { StrokeMove, VariantStroke };
