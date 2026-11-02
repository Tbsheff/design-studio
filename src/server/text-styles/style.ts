import { TEXT_STYLE_PROPS } from "./deps.js";
import type {
  TextStyle,
  TextStyleProp,
  TextStyleSource,
  TextStyleValues,
  TextStyleVars,
} from "./deps.js";

interface StyleSeed {
  file: string;
  name: string;
  source: TextStyleSource;
  values: Partial<TextStyleValues>;
  vars?: TextStyleVars;
}

const SLUG_MAX = 48;
const SLUG_SPLIT = /[^a-z0-9]+/u;

const slug = (raw: string): string =>
  raw
    .toLowerCase()
    .split(SLUG_SPLIT)
    .filter((part) => part !== "")
    .join("-")
    .slice(0, SLUG_MAX);

const emptyValues = (): TextStyleValues => ({
  family: null,
  letterSpacing: null,
  lineHeight: null,
  size: null,
  weight: null,
});

const makeStyle = (seed: StyleSeed): TextStyle => ({
  ...emptyValues(),
  ...seed.values,
  file: seed.file,
  name: slug(seed.name),
  source: seed.source,
  vars: seed.vars ?? {},
});

const hasText = (style: TextStyle): boolean =>
  style.size !== null || style.family !== null;

const propValue = (style: TextStyle, prop: TextStyleProp): string | null => {
  const name = style.vars[prop];

  if (name) {
    return `var(${name})`;
  }

  return style[prop];
};

const setProps = (style: TextStyle): TextStyleProp[] =>
  TEXT_STYLE_PROPS.filter((prop) => style[prop] !== null);

export { emptyValues, hasText, makeStyle, propValue, setProps, slug };

export type { StyleSeed };
