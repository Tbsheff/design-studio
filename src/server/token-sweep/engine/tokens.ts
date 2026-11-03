import { parseColor } from "./color.js";
import { lengthPx } from "./length.js";
import type { SweepToken } from "./types.js";

interface TokenEntry {
  readonly cssVar: string;
  readonly type: string;
  readonly value: string;
}

const COLOR_NAMESPACE = "--color-";
const OPAQUE = 1;

const NAMESPACE_OF = {
  font: "--text-",
  radius: "--radius-",
  spacing: "--spacing-",
} as const;

const RADIUS_VAR = /^--radius(?:-|$)/u;
const SPACING_VAR = /^--spacing(?:-|$)/u;
const TEXT_VAR = /^--text(?:-|$)/u;

const suffixOf = (cssVar: string, namespace: string): string | null => {
  if (!cssVar.startsWith(namespace)) {
    return null;
  }

  const rest = cssVar.slice(namespace.length);

  if (rest === "" || rest.includes("--")) {
    return null;
  }

  return rest;
};

const lengthKindOf = (cssVar: string): keyof typeof NAMESPACE_OF | null => {
  if (RADIUS_VAR.test(cssVar)) {
    return "radius";
  }

  if (SPACING_VAR.test(cssVar)) {
    return "spacing";
  }

  if (TEXT_VAR.test(cssVar) && !cssVar.slice(2).includes("--")) {
    return "font";
  }

  return null;
};

const toColorToken = (entry: TokenEntry): SweepToken | null => {
  const parsed = parseColor(entry.value);

  if (parsed === null || parsed.alpha < OPAQUE) {
    return null;
  }

  return {
    cssVar: entry.cssVar,
    kind: "color",
    px: null,
    rgb: parsed.rgb,
    suffix: suffixOf(entry.cssVar, COLOR_NAMESPACE),
  };
};

const toLengthToken = (entry: TokenEntry): SweepToken | null => {
  const lengthKind = lengthKindOf(entry.cssVar);
  const size = lengthPx(entry.value);

  if (lengthKind === null || size === null || size <= 0) {
    return null;
  }

  return {
    cssVar: entry.cssVar,
    kind: lengthKind,
    px: size,
    rgb: null,
    suffix: suffixOf(entry.cssVar, NAMESPACE_OF[lengthKind]),
  };
};

const toSweepToken = (entry: TokenEntry): SweepToken | null => {
  if (entry.type === "color" || entry.cssVar.startsWith(COLOR_NAMESPACE)) {
    return toColorToken(entry);
  }

  return toLengthToken(entry);
};

const buildSweepTokens = (entries: readonly TokenEntry[]): SweepToken[] => {
  const tokens: SweepToken[] = [];

  for (const entry of entries) {
    const token = toSweepToken(entry);

    if (token !== null) {
      tokens.push(token);
    }
  }

  return tokens;
};

export { buildSweepTokens };

export type { TokenEntry };
