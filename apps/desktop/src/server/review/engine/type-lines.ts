import {
  toCounts,
  toEachHit,
  toNearestStep,
  toPx,
  toRounded,
  toStyleFix,
} from "./type-facts.js";
import type { TypeBox, TypeHit, TypeStep, TypeText } from "./type-facts.js";

const MAX_CHARS = 85;

const MIN_BODY_LEADING = 1.35;

const MAX_HEADING_LEADING = 1.4;

const LARGE_TEXT = 32;

const BODY_LIMIT = 20;

const SPACE_STEP = 4;

const STEP_TOLERANCE = 0.01;

const SHARED_OFF = 3;

const LEADING_DIGITS = 2;

const SIDE = /-(?:top|right|bottom|left)$/u;

const toLeading = (text: TypeText): string =>
  (text.lineHeight / text.size).toFixed(LEADING_DIGITS);

const toLineHits = (texts: readonly TypeText[]): TypeHit[] =>
  toEachHit(
    texts,
    (text) => text.isBlock && text.chars > MAX_CHARS,
    (text) => ({
      fix: {
        label: "Limit line length",
        style: { "max-width": "65ch" },
        tailwindClass: "max-w-prose",
      },
      hint: "Keep body lines at about 45 to 75 characters, for example with max-width: 65ch or max-w-prose.",
      message: `Lines in this text are about ${text.chars} characters long. Keep them at ${MAX_CHARS} characters or fewer.`,
      selector: text.selector,
      severity: "medium",
    })
  );

const toTightHits = (texts: readonly TypeText[]): TypeHit[] =>
  toEachHit(
    texts,
    (text) =>
      !text.isHeading &&
      text.lines >= 2 &&
      text.size < BODY_LIMIT &&
      text.lineHeight / text.size < MIN_BODY_LEADING,
    (text) => ({
      fix: toStyleFix("Set line height 1.5", { "line-height": "1.5" }),
      hint: "Give body text that wraps a line height of about 1.5.",
      message: `This text wraps to ${text.lines} lines with a line height of ${toLeading(text)}. Use ${MIN_BODY_LEADING} or more.`,
      selector: text.selector,
      severity: "medium",
    })
  );

const toLooseHits = (texts: readonly TypeText[]): TypeHit[] =>
  toEachHit(
    texts,
    (text) =>
      text.size >= LARGE_TEXT &&
      text.lineHeight / text.size > MAX_HEADING_LEADING,
    (text) => ({
      fix: toStyleFix("Set line height 1.25", { "line-height": "1.25" }),
      hint: "Give large headings a tight line height of about 1.1 to 1.25.",
      message: `This ${toPx(toRounded(text.size))} text has a line height of ${toLeading(text)}. Use ${MAX_HEADING_LEADING} or less on large text.`,
      selector: text.selector,
      severity: "low",
    })
  );

const isOffStep = (px: number): boolean =>
  Math.abs(px / SPACE_STEP - Math.round(px / SPACE_STEP)) > STEP_TOLERANCE;

const toSpaceValue = (px: number, steps: readonly TypeStep[]): string => {
  const step = toNearestStep(px, steps);

  if (step) {
    return `var(${step.cssVar})`;
  }

  return `${Math.max(SPACE_STEP, Math.round(px / SPACE_STEP) * SPACE_STEP)}px`;
};

const toSpaceHit = (
  box: TypeBox,
  shared: ReadonlyMap<number, number>,
  steps: readonly TypeStep[]
): TypeHit | null => {
  const off = box.spaces.filter(
    (space) => isOffStep(space.px) && (shared.get(space.px) ?? 0) >= SHARED_OFF
  );

  const [first] = off;

  if (!first) {
    return null;
  }

  const value = toSpaceValue(first.px, steps);

  const style = Object.fromEntries(
    off.map((space) => [space.prop, toSpaceValue(space.px, steps)])
  );

  const names = [
    ...new Set(off.map((space) => space.prop.replace(SIDE, ""))),
  ].join(", ");

  return {
    fix: toStyleFix(`Snap to ${value}`, style),
    hint: "Use spacing on a 4 px step (4, 8, 12, 16, 24, 32) or a spacing token.",
    message: `${names} ${toPx(first.px)} is not on the 4 px spacing scale; ${shared.get(first.px) ?? 0} elements use it. Use ${value}.`,
    selector: box.selector,
    severity: "low",
  };
};

const toOffValues = (box: TypeBox): number[] => [
  ...new Set(
    box.spaces.flatMap((space) => {
      if (!isOffStep(space.px)) {
        return [];
      }

      return [space.px];
    })
  ),
];

const toSpaceHits = (
  boxes: readonly TypeBox[],
  steps: readonly TypeStep[]
): TypeHit[] => {
  const shared = toCounts(boxes.flatMap((box) => toOffValues(box)));

  return boxes.flatMap((box) => {
    const hit = toSpaceHit(box, shared, steps);

    if (!hit) {
      return [];
    }

    return [hit];
  });
};

export { toLineHits, toLooseHits, toSpaceHits, toTightHits };
