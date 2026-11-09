import { toNumberText, toParsedNumber } from "./css-value-model.js";
import type { StyleValues } from "./css-value-model.js";

interface AspectChange {
  readonly add: string[];
  readonly remove: string[];
}

interface BoxSize {
  readonly height: number;
  readonly width: number;
}

const SQUARE_CLASS = "aspect-square";
const VIDEO_CLASS = "aspect-video";
const AUTO_HEIGHT_CLASS = "h-auto";
const VIDEO_WIDTH = 16;
const VIDEO_HEIGHT = 9;
const VIDEO_RATIO = VIDEO_WIDTH / VIDEO_HEIGHT;
const HUNDRED = 100;
const TENTH = 10;
const RATIO_TOLERANCE = 0.005;
const MAX_TERM = 64;
const ASPECT_RE = /^aspect-/u;
const FIXED_HEIGHT_RE = /^(?:h|size)-(?!auto$)/u;
const SIZE_RE = /^size-/u;
const RATIO_RE = /^(?<w>\d+(?:\.\d+)?)(?:\s*\/\s*(?<h>\d+(?:\.\d+)?))?$/u;

const toGcd = (first: number, second: number): number => {
  if (second === 0) {
    return first;
  }

  return toGcd(second, first % second);
};

const toRatioNumber = (raw: string): number | null => {
  const match = RATIO_RE.exec(raw.trim());

  if (!match?.groups) {
    return null;
  }

  const width = Number(match.groups.w);
  const height = Number(match.groups.h ?? "1");

  if (!(width > 0 && height > 0)) {
    return null;
  }

  return width / height;
};

const toBoxSize = (styles: Record<string, string>): BoxSize | null => {
  const width = toParsedNumber(styles["used-width"] ?? "")?.value ?? 0;
  const height = toParsedNumber(styles["used-height"] ?? "")?.value ?? 0;

  if (width > 0 && height > 0) {
    return { height, width };
  }

  return null;
};

const toReducedTerms = (box: BoxSize): readonly [number, number] => {
  const width = Math.max(1, Math.round(box.width));
  const height = Math.max(1, Math.round(box.height));
  const divisor = toGcd(width, height);

  return [width / divisor, height / divisor];
};

const toAspectClass = (box: BoxSize): string => {
  const ratio = box.width / box.height;

  if (Math.abs(ratio - 1) < RATIO_TOLERANCE) {
    return SQUARE_CLASS;
  }

  if (Math.abs(ratio - VIDEO_RATIO) < RATIO_TOLERANCE) {
    return VIDEO_CLASS;
  }

  const [width, height] = toReducedTerms(box);

  if (width > MAX_TERM || height > MAX_TERM) {
    return `aspect-[${Math.round(ratio * HUNDRED) / HUNDRED}]`;
  }

  return `aspect-[${width}/${height}]`;
};

const toAspectCss = (box: BoxSize): string => {
  const [width, height] = toReducedTerms(box);

  return `${width} / ${height}`;
};

const toLockedRatio = (
  values: Pick<StyleValues, "aspect-ratio" | "height">,
  authoredHeight: string
): number | null => {
  const height = authoredHeight.trim();

  if (height !== "" && height !== "auto") {
    return null;
  }

  return toRatioNumber(values["aspect-ratio"]);
};

const toSizeReplacement = (name: string): string => name.replace(SIZE_RE, "w-");

const toLockClassChange = (
  classes: readonly string[],
  box: BoxSize
): AspectChange => {
  const aspect = toAspectClass(box);
  const sized = classes.filter((name) => name.startsWith("size-"));
  const hasWidth = classes.some((name) => name.startsWith("w-"));

  const add = [aspect, AUTO_HEIGHT_CLASS];

  if (!hasWidth) {
    add.push(...sized.map((name) => toSizeReplacement(name)));
  }

  const remove = classes.filter(
    (name) =>
      (ASPECT_RE.test(name) || FIXED_HEIGHT_RE.test(name)) &&
      !add.includes(name)
  );

  return { add: add.filter((name) => !classes.includes(name)), remove };
};

const toUnlockClassChange = (
  classes: readonly string[],
  box: BoxSize
): AspectChange => {
  const height = `h-[${Math.round(box.height * TENTH) / TENTH}px]`;

  return {
    add: [height],
    remove: classes.filter(
      (name) => ASPECT_RE.test(name) || name === AUTO_HEIGHT_CLASS
    ),
  };
};

const toLockStyleChange = (box: BoxSize): Partial<StyleValues> => ({
  "aspect-ratio": toAspectCss(box),
  height: "auto",
});

const toUnlockStyleChange = (box: BoxSize): Partial<StyleValues> => ({
  "aspect-ratio": "",
  height: toNumberText(box.height, "px"),
});

const toLockedPatch = (
  patch: Partial<StyleValues>,
  ratio: number
): Partial<StyleValues> => {
  const { height: raw, ...rest } = patch;
  const height = raw ?? null;

  if (height === null) {
    return patch;
  }

  const parsed = toParsedNumber(height);

  if (!parsed || parsed.unit !== "px") {
    return rest;
  }

  return { ...rest, width: toNumberText(parsed.value * ratio, "px") };
};

export {
  toBoxSize,
  toLockClassChange,
  toLockStyleChange,
  toLockedPatch,
  toLockedRatio,
  toUnlockClassChange,
  toUnlockStyleChange,
};

export type { AspectChange, BoxSize };
