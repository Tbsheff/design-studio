import type { Classified } from "./classes.js";
import { OUTLINE_PROPS, toOutlineClass, toOutlineToken } from "./outline.js";
import type { OutlineGroup } from "./outline.js";
import { toRotateScaleClass, toRotateScaleToken } from "./rotate-scale.js";
import type { TailwindTheme } from "./theme-model.js";

const Z_INDEX = "z-index";

const SMOOTHING_PROP = "corner-shape";

type AddedGroup = OutlineGroup | typeof Z_INDEX | typeof SMOOTHING_PROP;

const ADDED_PROPS = {
  ...OUTLINE_PROPS,
  [SMOOTHING_PROP]: SMOOTHING_PROP,
  [Z_INDEX]: Z_INDEX,
} satisfies Record<string, AddedGroup>;

const TAILWIND_V4 = 4;

const V3_Z_STEPS: ReadonlySet<string> = new Set([
  "0",
  "10",
  "20",
  "30",
  "40",
  "50",
]);

const INTEGER_RE = /^-?\d+$/u;

const Z_CLASS_RE = /^z-(?:auto|\d+|\[[^\]]+\])$/u;

const isZStep = (whole: number, theme: TailwindTheme): boolean => {
  if (theme.version === TAILWIND_V4) {
    return true;
  }

  return V3_Z_STEPS.has(`${Math.abs(whole)}`);
};

const toZIndexToken = (value: string, theme: TailwindTheme): string => {
  const text = value.trim();

  if (text === "auto") {
    return "z-auto";
  }

  if (INTEGER_RE.test(text) && isZStep(Number(text), theme)) {
    const whole = Number(text);

    if (whole < 0) {
      return `-z-${Math.abs(whole)}`;
    }

    return `z-${whole}`;
  }

  return `z-[${text.replaceAll(/\s+/gu, "_")}]`;
};

const toAddedToken = (
  prop: string,
  value: string,
  theme: TailwindTheme
): string | null => {
  if (prop === Z_INDEX) {
    return toZIndexToken(value, theme);
  }

  return (
    toOutlineToken(prop, value, theme) ?? toRotateScaleToken(prop, value, theme)
  );
};

const toZIndexClass = (utility: string): Classified | null => {
  if (Z_CLASS_RE.test(utility)) {
    return { group: Z_INDEX, kind: "single" };
  }

  return null;
};

const toAddedClass = (utility: string): Classified | null =>
  toOutlineClass(utility) ??
  toRotateScaleClass(utility) ??
  toZIndexClass(utility);

export { ADDED_PROPS, toAddedClass, toAddedToken };

export type { AddedGroup };
