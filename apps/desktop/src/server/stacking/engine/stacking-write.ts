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

const failed = <Value>(code: string): WriteResult<Value> => ({
  code,
  ok: false,
});

const passed = <Value>(value: Value): WriteResult<Value> => ({
  ok: true,
  value,
});

const arbitrary = (value: string): string =>
  `[${value.trim().replaceAll(/\s+/gu, "_")}]`;

const spacingKeyOf = (
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

const insetKeyOf = (value: string, theme: TailwindTheme | null): string => {
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
    return arbitrary(trimmed);
  }

  const key = spacingKeyOf(Number(px.groups?.size), theme);

  if (key !== null) {
    return `${px.groups?.sign ?? ""}${key}`;
  }

  return arbitrary(trimmed);
};

const withSign = (head: string, key: string): string => {
  if (key.startsWith("-")) {
    return `-${head}-${key.slice(1)}`;
  }

  return `${head}-${key}`;
};

const zKeyOf = (value: string): string => {
  const trimmed = value.trim();

  if (TOKEN.test(trimmed)) {
    return arbitrary(`var(${trimmed})`);
  }

  if (tokenOfCss(trimmed) !== null) {
    return arbitrary(trimmed);
  }

  return trimmed;
};

const zTokenOf = (value: string): WriteResult<string> => {
  const key = zKeyOf(value);

  if (INTEGER.test(key) || key === "auto" || key.startsWith("[")) {
    return passed(withSign("z", key));
  }

  if (/^[a-z][\w-]*$/u.test(key)) {
    return passed(`z-${key}`);
  }

  return failed(
    `z-index ${value} is not valid. Use an integer, auto or a token like --z-header.`
  );
};

const isSide = (prop: string): prop is StackingSide =>
  (STACKING_SIDES as readonly string[]).includes(prop);

const conflictTest = (prop: string): ((utility: string) => boolean) => {
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

const rawsWhere = (
  scoped: readonly ScopedClass[],
  test: (utility: string) => boolean
): string[] =>
  scoped.flatMap((entry) => {
    if (test(entry.utility)) {
      return [entry.raw];
    }

    return [];
  });

const conflictsOf = (scoped: readonly ScopedClass[], prop: string): string[] =>
  rawsWhere(scoped, conflictTest(prop));

const tokenFor = (
  prop: string,
  value: string,
  theme: TailwindTheme | null
): WriteResult<string> => {
  if (prop === "position") {
    if (!POSITION.has(value)) {
      return failed(
        `position ${value} is not valid. Use ${STACKING_POSITIONS.join(", ")}.`
      );
    }

    return passed(value);
  }

  if (prop === "z-index") {
    return zTokenOf(value);
  }

  if (isSide(prop)) {
    return passed(withSign(prop, insetKeyOf(value, theme)));
  }

  return failed(`${prop} is not a stacking property.`);
};

const tokenOrNull = (
  prop: string,
  value: string | null,
  theme: TailwindTheme | null
): WriteResult<string | null> => {
  if (value === null) {
    return passed(null);
  }

  return tokenFor(prop, value, theme);
};

const overflowFinal = (
  current: string | null,
  changes: StackingChanges,
  prop: "overflow-x" | "overflow-y"
): string | null => {
  if (prop in changes) {
    return changes[prop] ?? null;
  }

  return current;
};

const overflowTokens = (
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

const overflowChanges = (
  classes: readonly string[],
  prefix: string,
  changes: StackingChanges
): WriteResult<ClassChanges> => {
  if (!(OVERFLOW_X in changes) && !(OVERFLOW_Y in changes)) {
    return passed({ add: [], remove: [] });
  }

  const current = classStackingOf(classes, prefix, null);
  const finalX = overflowFinal(current.overflowX.value, changes, OVERFLOW_X);
  const finalY = overflowFinal(current.overflowY.value, changes, OVERFLOW_Y);

  for (const word of [finalX, finalY]) {
    if (word !== null && !OVERFLOW.has(word)) {
      return failed(
        `overflow ${word} is not valid. Use ${STACKING_OVERFLOWS.join(", ")}.`
      );
    }
  }

  const remove = rawsWhere(scopedClassesOf(classes, prefix), (utility) =>
    OVERFLOW_CLASS.test(utility)
  );

  const add = overflowTokens(finalX, finalY).map(
    (token) => `${prefix}${token}`
  );

  return passed({ add, remove });
};

const stackingClassChanges = (
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
    remove.push(...conflictsOf(scoped, prop));

    const token = tokenOrNull(prop, value ?? null, theme);

    if (!token.ok) {
      return token;
    }

    if (token.value !== null) {
      add.push(`${prefix}${token.value}`);
    }
  }

  const overflow = overflowChanges(classes, prefix, changes);

  if (!overflow.ok) {
    return overflow;
  }

  const added = new Set([...add, ...overflow.value.add]);

  const removed = [...new Set([...remove, ...overflow.value.remove])].filter(
    (raw) => !added.has(raw)
  );

  return passed({ add: [...added], remove: removed });
};

const cssValueFor = (prop: string, value: string | null): string | null => {
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

const stackingCssStyle = (changes: StackingChanges): StackingChanges => {
  const style: CssStyle = {};

  for (const [prop, value] of Object.entries(changes)) {
    style[prop] = cssValueFor(prop, value ?? null);
  }

  return style;
};

export { stackingClassChanges, stackingCssStyle };

export type { ClassChanges, CssStyle, WriteResult };
