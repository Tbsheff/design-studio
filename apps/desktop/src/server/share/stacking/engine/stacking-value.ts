import { Z_SCALE } from "./deps.js";
import type { StackingSource, StackingValue, TailwindTheme } from "./deps.js";

const UNSET: StackingValue = {
  className: null,
  source: "unset",
  token: null,
  value: null,
};

const VAR_NAME = /^var\(\s*(?<name>--[\w-]+)\s*(?:,[^)]*)?\)$/u;

const NUMBER = /^\d+(?:\.\d+)?$/u;

const FRACTION = /^(?<top>\d+)\/(?<bottom>\d+)$/u;

const PERCENT = 100;

const ROUNDING = 100;

const DEFAULT_SPACING_PX = 4;

const INSET_WORDS = new Map([
  ["auto", "auto"],
  ["full", "100%"],
  ["px", "1px"],
]);

const toTokenOfCss = (value: string): string | null => {
  const hit = VAR_NAME.exec(value.trim());

  if (hit === null) {
    return null;
  }

  return hit.groups?.name ?? null;
};

const toCssValueOf = (value: string): StackingValue => {
  const name = toTokenOfCss(value);
  let kind: StackingSource = "css";

  if (name !== null) {
    kind = "token";
  }

  return { className: null, source: kind, token: name, value: value.trim() };
};

const toSigned = (value: string, negative: boolean): string => {
  if (!negative || value === "0px" || value === "auto") {
    return value;
  }

  return `-${value}`;
};

const toBracketValue = (
  className: string,
  key: string,
  negative: boolean
): StackingValue | null => {
  if (key.startsWith("[") && key.endsWith("]")) {
    const inner = key.slice(1, -1).replaceAll("_", " ");
    const token = toTokenOfCss(inner);
    let source: StackingSource = "arbitrary";

    if (token !== null) {
      source = "token";
    }

    return { className, source, token, value: toSigned(inner, negative) };
  }

  if (key.startsWith("(") && key.endsWith(")")) {
    const name = key.slice(1, -1);

    return {
      className,
      source: "token",
      token: name,
      value: toSigned(`var(${name})`, negative),
    };
  }

  return null;
};

const toFractionPercent = (key: string): string | null => {
  const hit = FRACTION.exec(key);

  if (hit === null) {
    return null;
  }

  const ratio = Number(hit.groups?.top) / Number(hit.groups?.bottom);

  return `${Math.round(ratio * PERCENT * ROUNDING) / ROUNDING}%`;
};

const toSpacingPx = (
  key: string,
  theme: TailwindTheme | null
): string | null => {
  const named = theme?.spacing.get(key) ?? null;

  if (named !== null) {
    return `${named}px`;
  }

  if (!NUMBER.test(key)) {
    return null;
  }

  const step = theme?.spacingPx ?? DEFAULT_SPACING_PX;

  return `${Number(key) * step}px`;
};

const toInsetValueOf = (
  className: string,
  key: string,
  negative: boolean,
  theme: TailwindTheme | null
): StackingValue => {
  const bracket = toBracketValue(className, key, negative);

  if (bracket !== null) {
    return bracket;
  }

  const word = INSET_WORDS.get(key) ?? toFractionPercent(key);

  if (word !== null) {
    return {
      className,
      source: "class",
      token: key,
      value: toSigned(word, negative),
    };
  }

  const px = toSpacingPx(key, theme);

  if (px === null) {
    return { className, source: "token", token: key, value: null };
  }

  return {
    className,
    source: "scale",
    token: key,
    value: toSigned(px, negative),
  };
};

const toZValueOf = (
  className: string,
  key: string,
  negative: boolean
): StackingValue => {
  const bracket = toBracketValue(className, key, negative);

  if (bracket !== null) {
    return bracket;
  }

  if ((Z_SCALE as readonly string[]).includes(key)) {
    return {
      className,
      source: "scale",
      token: key,
      value: toSigned(key, negative),
    };
  }

  if (NUMBER.test(key)) {
    return {
      className,
      source: "class",
      token: key,
      value: toSigned(key, negative),
    };
  }

  return { className, source: "token", token: key, value: null };
};

const toKeywordValueOf = (raw: string, word: string): StackingValue => ({
  className: raw,
  source: "class",
  token: null,
  value: word,
});

export {
  toCssValueOf as cssValueOf,
  toInsetValueOf as insetValueOf,
  toKeywordValueOf as keywordValueOf,
  toTokenOfCss as tokenOfCss,
  UNSET,
  toZValueOf as zValueOf,
};
