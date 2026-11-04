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

const tokenOfCss = (value: string): string | null => {
  const hit = VAR_NAME.exec(value.trim());

  if (hit === null) {
    return null;
  }

  return hit.groups?.name ?? null;
};

const cssValueOf = (value: string): StackingValue => {
  const name = tokenOfCss(value);
  let kind: StackingSource = "css";

  if (name !== null) {
    kind = "token";
  }

  return { className: null, source: kind, token: name, value: value.trim() };
};

const signed = (value: string, negative: boolean): string => {
  if (!negative || value === "0px" || value === "auto") {
    return value;
  }

  return `-${value}`;
};

const bracketValue = (
  className: string,
  key: string,
  negative: boolean
): StackingValue | null => {
  if (key.startsWith("[") && key.endsWith("]")) {
    const inner = key.slice(1, -1).replaceAll("_", " ");
    const token = tokenOfCss(inner);
    let source: StackingSource = "arbitrary";

    if (token !== null) {
      source = "token";
    }

    return { className, source, token, value: signed(inner, negative) };
  }

  if (key.startsWith("(") && key.endsWith(")")) {
    const name = key.slice(1, -1);

    return {
      className,
      source: "token",
      token: name,
      value: signed(`var(${name})`, negative),
    };
  }

  return null;
};

const fractionPercent = (key: string): string | null => {
  const hit = FRACTION.exec(key);

  if (hit === null) {
    return null;
  }

  const ratio = Number(hit.groups?.top) / Number(hit.groups?.bottom);

  return `${Math.round(ratio * PERCENT * ROUNDING) / ROUNDING}%`;
};

const spacingPx = (key: string, theme: TailwindTheme | null): string | null => {
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

const insetValueOf = (
  className: string,
  key: string,
  negative: boolean,
  theme: TailwindTheme | null
): StackingValue => {
  const bracket = bracketValue(className, key, negative);

  if (bracket !== null) {
    return bracket;
  }

  const word = INSET_WORDS.get(key) ?? fractionPercent(key);

  if (word !== null) {
    return {
      className,
      source: "class",
      token: key,
      value: signed(word, negative),
    };
  }

  const px = spacingPx(key, theme);

  if (px === null) {
    return { className, source: "token", token: key, value: null };
  }

  return {
    className,
    source: "scale",
    token: key,
    value: signed(px, negative),
  };
};

const zValueOf = (
  className: string,
  key: string,
  negative: boolean
): StackingValue => {
  const bracket = bracketValue(className, key, negative);

  if (bracket !== null) {
    return bracket;
  }

  if ((Z_SCALE as readonly string[]).includes(key)) {
    return {
      className,
      source: "scale",
      token: key,
      value: signed(key, negative),
    };
  }

  if (NUMBER.test(key)) {
    return {
      className,
      source: "class",
      token: key,
      value: signed(key, negative),
    };
  }

  return { className, source: "token", token: key, value: null };
};

const keywordValueOf = (raw: string, word: string): StackingValue => ({
  className: raw,
  source: "class",
  token: null,
  value: word,
});

export {
  cssValueOf,
  insetValueOf,
  keywordValueOf,
  tokenOfCss,
  UNSET,
  zValueOf,
};
