import { isBorderWidthSuffix } from "./border-sides.js";
import type { Classified } from "./classes.js";
import type { TailwindTheme } from "./theme-model.js";
import { lengthToPx } from "./units.js";

const OUTLINE_GROUPS = [
  "outline-width",
  "outline-style",
  "outline-color",
  "outline-offset",
] as const;

type OutlineGroup =
  | (typeof OUTLINE_GROUPS)[number]
  | "ring-width"
  | "ring-color";

const [OUTLINE_WIDTH, OUTLINE_STYLE, OUTLINE_COLOR, OUTLINE_OFFSET] =
  OUTLINE_GROUPS;

const PX_TOLERANCE = 0.01;

const TAILWIND_V4 = 4;

const V3_STEPS: ReadonlySet<string> = new Set(["0", "1", "2", "4", "8"]);

const OUTLINE_PROPS = Object.fromEntries(
  OUTLINE_GROUPS.map((group) => [group, group])
);

const OUTLINE_STYLES: ReadonlySet<string> = new Set([
  "dashed",
  "dotted",
  "double",
  "hidden",
  "none",
  "solid",
]);

const STYLE_TOKENS = new Map([
  ["dashed", "outline-dashed"],
  ["dotted", "outline-dotted"],
  ["double", "outline-double"],
  ["solid", "outline"],
]);

const RING_NOT_COLOR = /^(?:inset|offset(?:-|$))/u;

const toSingle = (group: OutlineGroup): Classified => ({
  group,
  kind: "single",
});

const toOutlineGroup = (suffix: string): OutlineGroup => {
  if (suffix.startsWith("offset-")) {
    return OUTLINE_OFFSET;
  }

  if (OUTLINE_STYLES.has(suffix)) {
    return OUTLINE_STYLE;
  }

  if (isBorderWidthSuffix(suffix)) {
    return OUTLINE_WIDTH;
  }

  return OUTLINE_COLOR;
};

const toRingClass = (suffix: string): Classified | null => {
  if (RING_NOT_COLOR.test(suffix)) {
    return null;
  }

  if (isBorderWidthSuffix(suffix)) {
    return toSingle("ring-width");
  }

  return toSingle("ring-color");
};

const toOutlineClass = (utility: string): Classified | null => {
  if (utility === "outline") {
    return toSingle(OUTLINE_STYLE);
  }

  if (utility === "ring") {
    return toSingle("ring-width");
  }

  if (utility.startsWith("outline-")) {
    return toSingle(toOutlineGroup(utility.slice("outline-".length)));
  }

  if (utility.startsWith("ring-")) {
    return toRingClass(utility.slice("ring-".length));
  }

  return null;
};

const isWholeStep = (whole: number, theme: TailwindTheme): boolean => {
  if (theme.version === TAILWIND_V4) {
    return whole >= 0;
  }

  return V3_STEPS.has(`${whole}`);
};

const toLengthSuffix = (value: string, theme: TailwindTheme): string => {
  const px = lengthToPx(value);

  if (px !== null) {
    const whole = Math.round(px);

    if (Math.abs(px - whole) < PX_TOLERANCE && isWholeStep(whole, theme)) {
      return `${whole}`;
    }
  }

  return `[${value.trim().replaceAll(/\s+/gu, "_")}]`;
};

const toOffsetToken = (value: string, theme: TailwindTheme): string => {
  const text = value.trim();

  if (text.startsWith("-")) {
    return `-outline-offset-${toLengthSuffix(text.slice(1), theme)}`;
  }

  return `outline-offset-${toLengthSuffix(text, theme)}`;
};

const toStyleToken = (value: string, theme: TailwindTheme): string => {
  const text = value.trim();
  const token = STYLE_TOKENS.get(text);

  if (token) {
    return token;
  }

  if (text === "none" && theme.version === TAILWIND_V4) {
    return "outline-none";
  }

  return `[outline-style:${text}]`;
};

const toOutlineToken = (
  prop: string,
  value: string,
  theme: TailwindTheme
): string | null => {
  if (prop === OUTLINE_WIDTH) {
    return `outline-${toLengthSuffix(value, theme)}`;
  }

  if (prop === OUTLINE_OFFSET) {
    return toOffsetToken(value, theme);
  }

  if (prop === OUTLINE_STYLE) {
    return toStyleToken(value, theme);
  }

  return null;
};

export { OUTLINE_PROPS, toOutlineClass, toOutlineToken };

export type { OutlineGroup };
