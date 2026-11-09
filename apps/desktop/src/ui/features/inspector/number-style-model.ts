import type { StyleValues } from "./css-value-model.js";

type NumberSpacing = "default" | "proportional" | "tabular";

type NumberFigure = "default" | "lining" | "oldstyle";

interface NumberStyle {
  readonly figure: NumberFigure;
  readonly isSlashed: boolean;
  readonly spacing: NumberSpacing;
}

interface ClassChange {
  readonly add: string[];
  readonly remove: string[];
}

const WHITESPACE = /\s+/u;
const PROP = "font-variant-numeric";
const TABULAR = "tabular-nums";
const PROPORTIONAL = "proportional-nums";
const LINING = "lining-nums";
const OLDSTYLE = "oldstyle-nums";
const SLASHED = "slashed-zero";
const NORMAL = "normal-nums";
const OWNED = new Set([TABULAR, PROPORTIONAL, LINING, OLDSTYLE, SLASHED]);
const NUMERIC = new Set([...OWNED, NORMAL]);

const SPACING_BY_CLASS = {
  [PROPORTIONAL]: "proportional",
  [TABULAR]: "tabular",
} as const;

const FIGURE_BY_CLASS = {
  [LINING]: "lining",
  [OLDSTYLE]: "oldstyle",
} as const;

const CLASS_BY_SPACING: Record<NumberSpacing, string[]> = {
  default: [],
  proportional: [PROPORTIONAL],
  tabular: [TABULAR],
};

const CLASS_BY_FIGURE: Record<NumberFigure, string[]> = {
  default: [],
  lining: [LINING],
  oldstyle: [OLDSTYLE],
};

const toTokenStyle = (tokens: readonly string[]): NumberStyle => {
  let spacing: NumberSpacing = "default";
  let figure: NumberFigure = "default";

  for (const name of tokens) {
    if (name === TABULAR || name === PROPORTIONAL) {
      spacing = SPACING_BY_CLASS[name];
    }

    if (name === LINING || name === OLDSTYLE) {
      figure = FIGURE_BY_CLASS[name];
    }
  }

  const isSlashed = tokens.includes(SLASHED);

  return { figure, isSlashed, spacing };
};

const toNumberStyle = (
  values: Partial<StyleValues>,
  classes: readonly string[] | null
): NumberStyle => {
  if (classes?.some((name) => NUMERIC.has(name))) {
    return toTokenStyle(classes);
  }

  return toTokenStyle((values[PROP] ?? "").split(WHITESPACE));
};

const toStyleTokens = (style: NumberStyle): string[] => {
  const tokens = [
    ...CLASS_BY_SPACING[style.spacing],
    ...CLASS_BY_FIGURE[style.figure],
  ];

  if (style.isSlashed) {
    tokens.push(SLASHED);
  }

  return tokens;
};

const toStyleChange = (style: NumberStyle): Partial<StyleValues> => ({
  [PROP]: toStyleTokens(style).join(" "),
});

const toClassChange = (
  classes: readonly string[],
  style: NumberStyle
): ClassChange => {
  const wanted = new Set(toStyleTokens(style));
  const current = new Set(classes);
  const remove = classes.filter((name) => OWNED.has(name) && !wanted.has(name));

  const add = [...wanted].filter((name) => !current.has(name));

  return { add, remove };
};

const toSpacingStyle = (
  style: NumberStyle,
  spacing: NumberSpacing
): NumberStyle => ({ ...style, spacing });

const toFigureStyle = (
  style: NumberStyle,
  figure: NumberFigure
): NumberStyle => ({ ...style, figure });

const toSlashedStyle = (style: NumberStyle): NumberStyle => ({
  ...style,
  isSlashed: !style.isSlashed,
});

export {
  toClassChange,
  toFigureStyle,
  toNumberStyle,
  toSlashedStyle,
  toSpacingStyle,
  toStyleChange,
};

export type { ClassChange, NumberFigure, NumberSpacing, NumberStyle };
