import {
  STACKING_OVERFLOWS,
  STACKING_POSITIONS,
  STACKING_SIDES,
} from "./deps.js";
import type { StackingChanges, StackingSide, TailwindTheme } from "./deps.js";
import { classStackingOf, scopedClassesOf } from "./stacking-read.js";
import type { ScopedClass } from "./stacking-read.js";
import { tokenOfCss } from "./stacking-value.js";

type WriteResult<Value> =
  | { readonly ok: true; readonly value: Value }
  | { readonly code: string; readonly ok: false };

type CssStyle = Record<string, string | null>;

interface ClassChanges {
  readonly add: string[];
  readonly remove: string[];
}

const NUMBER = /^-?\d+(?:\.\d+)?$/u;

const PX = /^(?<sign>-?)(?<size>\d+(?:\.\d+)?)px$/u;

const OVERFLOW_X = "overflow-x";

const OVERFLOW_Y = "overflow-y";

const INTEGER = /^-?\d+$/u;

const TOKEN = /^--[\w-]+$/u;

const OVERFLOW_CLASS = /^overflow-(?:[xy]-)?[a-z]+$/u;

const SPACING_WORD = /^(?:px|full|auto|\d+\/\d+)$/u;

const POSITION = new Set<string>(STACKING_POSITIONS);

const OVERFLOW = new Set<string>(STACKING_OVERFLOWS);

const toFailed = <Value>(code: string): WriteResult<Value> => ({
  code,
  ok: false,
});

const toPassed = <Value>(value: Value): WriteResult<Value> => ({
  ok: true,
  value,
});

const toArbitrary = (value: string): string =>
  `[${value.trim().replaceAll(/\s+/gu, "_")}]`;

const toSpacingKeyOf = (
  px: number,
  theme: TailwindTheme | null
): string | null => {
  for (const [key, size] of theme?.spacing ?? []) {
    if (size === px) {
      return key;
    }
  }

  const step = theme?.spacingPx ?? 0;

  if (step > 0 && Number.isInteger(px / step)) {
    return String(px / step);
  }

  return null;
};

const toInsetKeyOf = (value: string, theme: TailwindTheme | null): string => {
  const trimmed = value.trim();

  if (trimmed === "100%") {
    return "full";
  }

  if (NUMBER.test(trimmed) || SPACING_WORD.test(trimmed)) {
    return trimmed;
  }

  if (theme?.spacing.has(trimmed)) {
    return trimmed;
  }

  const px = PX.exec(trimmed);

  if (px === null) {
    return toArbitrary(trimmed);
  }

  const key = toSpacingKeyOf(Number(px.groups?.size), theme);

  if (key !== null) {
    return `${px.groups?.sign ?? ""}${key}`;
  }

  return toArbitrary(trimmed);
};

const toWithSign = (head: string, key: string): string => {
  if (key.startsWith("-")) {
    return `-${head}-${key.slice(1)}`;
  }

  return `${head}-${key}`;
};

const toZKeyOf = (value: string): string => {
  const trimmed = value.trim();

  if (TOKEN.test(trimmed)) {
    return toArbitrary(`var(${trimmed})`);
  }

  if (tokenOfCss(trimmed) !== null) {
    return toArbitrary(trimmed);
  }

  return trimmed;
};

const toZTokenOf = (value: string): WriteResult<string> => {
  const key = toZKeyOf(value);

  if (INTEGER.test(key) || key === "auto" || key.startsWith("[")) {
    return toPassed(toWithSign("z", key));
  }

  if (/^[a-z][\w-]*$/u.test(key)) {
    return toPassed(`z-${key}`);
  }

  return toFailed(
    `z-index ${value} is not valid. Use an integer, auto or a token like --z-header.`
  );
};

const isSide = (prop: string): prop is StackingSide =>
  (STACKING_SIDES as readonly string[]).includes(prop);

const toConflictTest = (prop: string): ((utility: string) => boolean) => {
  if (prop === "position") {
    return (utility) => POSITION.has(utility);
  }

  if (prop === "z-index") {
    return (utility) => utility.startsWith("z-");
  }

  if (isSide(prop)) {
    return (utility) => utility.startsWith(`${prop}-`);
  }

  return () => false;
};

const toRawsWhere = (
  scoped: readonly ScopedClass[],
  test: (utility: string) => boolean
): string[] =>
  scoped.flatMap((entry) => {
    if (test(entry.utility)) {
      return [entry.raw];
    }

    return [];
  });

const toConflictsOf = (
  scoped: readonly ScopedClass[],
  prop: string
): string[] => toRawsWhere(scoped, toConflictTest(prop));

const toTokenFor = (
  prop: string,
  value: string,
  theme: TailwindTheme | null
): WriteResult<string> => {
  if (prop === "position") {
    if (!POSITION.has(value)) {
      return toFailed(
        `position ${value} is not valid. Use ${STACKING_POSITIONS.join(", ")}.`
      );
    }

    return toPassed(value);
  }

  if (prop === "z-index") {
    return toZTokenOf(value);
  }

  if (isSide(prop)) {
    return toPassed(toWithSign(prop, toInsetKeyOf(value, theme)));
  }

  return toFailed(`${prop} is not a stacking property.`);
};

const toTokenOrNull = (
  prop: string,
  value: string | null,
  theme: TailwindTheme | null
): WriteResult<string | null> => {
  if (value === null) {
    return toPassed(null);
  }

  return toTokenFor(prop, value, theme);
};

const toOverflowFinal = (
  current: string | null,
  changes: StackingChanges,
  prop: "overflow-x" | "overflow-y"
): string | null => {
  if (prop in changes) {
    return changes[prop] ?? null;
  }

  return current;
};

const toOverflowTokens = (
  finalX: string | null,
  finalY: string | null
): string[] => {
  if (finalX !== null && finalX === finalY) {
    return [`overflow-${finalX}`];
  }

  const out: string[] = [];

  if (finalX !== null) {
    out.push(`overflow-x-${finalX}`);
  }

  if (finalY !== null) {
    out.push(`overflow-y-${finalY}`);
  }

  return out;
};

const toOverflowChanges = (
  classes: readonly string[],
  prefix: string,
  changes: StackingChanges
): WriteResult<ClassChanges> => {
  if (!(OVERFLOW_X in changes) && !(OVERFLOW_Y in changes)) {
    return toPassed({ add: [], remove: [] });
  }

  const current = classStackingOf(classes, prefix, null);
  const finalX = toOverflowFinal(current.overflowX.value, changes, OVERFLOW_X);
  const finalY = toOverflowFinal(current.overflowY.value, changes, OVERFLOW_Y);

  for (const word of [finalX, finalY]) {
    if (word !== null && !OVERFLOW.has(word)) {
      return toFailed(
        `overflow ${word} is not valid. Use ${STACKING_OVERFLOWS.join(", ")}.`
      );
    }
  }

  const remove = toRawsWhere(scopedClassesOf(classes, prefix), (utility) =>
    OVERFLOW_CLASS.test(utility)
  );

  const add = toOverflowTokens(finalX, finalY).map(
    (token) => `${prefix}${token}`
  );

  return toPassed({ add, remove });
};

const toStackingClassChanges = (
  classes: readonly string[],
  prefix: string,
  changes: StackingChanges,
  theme: TailwindTheme | null
): WriteResult<ClassChanges> => {
  const scoped = scopedClassesOf(classes, prefix);
  const add: string[] = [];
  const remove: string[] = [];

  const single = Object.entries(changes).filter(
    ([prop]) => prop !== OVERFLOW_X && prop !== OVERFLOW_Y
  );

  for (const [prop, value] of single) {
    remove.push(...toConflictsOf(scoped, prop));

    const token = toTokenOrNull(prop, value ?? null, theme);

    if (!token.ok) {
      return token;
    }

    if (token.value !== null) {
      add.push(`${prefix}${token.value}`);
    }
  }

  const overflow = toOverflowChanges(classes, prefix, changes);

  if (!overflow.ok) {
    return overflow;
  }

  const added = new Set([...add, ...overflow.value.add]);

  const removed = [...new Set([...remove, ...overflow.value.remove])].filter(
    (raw) => !added.has(raw)
  );

  return toPassed({ add: [...added], remove: removed });
};

const toCssValueFor = (prop: string, value: string | null): string | null => {
  if (value === null) {
    return null;
  }

  const trimmed = value.trim();

  if (TOKEN.test(trimmed)) {
    return `var(${trimmed})`;
  }

  if (isSide(prop) && NUMBER.test(trimmed) && trimmed !== "0") {
    return `${trimmed}px`;
  }

  return trimmed;
};

const toStackingCssStyle = (changes: StackingChanges): StackingChanges => {
  const style: CssStyle = {};

  for (const [prop, value] of Object.entries(changes)) {
    style[prop] = toCssValueFor(prop, value ?? null);
  }

  return style;
};

export {
  toStackingClassChanges as stackingClassChanges,
  toStackingCssStyle as stackingCssStyle,
};

export type { ClassChanges, CssStyle, WriteResult };
