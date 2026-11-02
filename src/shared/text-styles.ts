const TEXT_STYLE_SOURCES = [
  "tailwind-theme",
  "tokens-json",
  "css-var",
  "design-md",
] as const;

type TextStyleSource = (typeof TEXT_STYLE_SOURCES)[number];

const TEXT_STYLE_PROPS = [
  "size",
  "weight",
  "lineHeight",
  "letterSpacing",
  "family",
] as const;

type TextStyleProp = (typeof TEXT_STYLE_PROPS)[number];

type TextStyleValues = Record<TextStyleProp, string | null>;

type TextStyleVars = Partial<Record<TextStyleProp, string>>;

interface TextStyle extends TextStyleValues {
  file: string;
  name: string;
  source: TextStyleSource;
  vars: TextStyleVars;
}

interface TextStyleList {
  sources: TextStyleSource[];
  styles: TextStyle[];
  total: number;
}

interface TextStyleApplyResult {
  classes: { add: string[]; remove: string[] } | null;
  file: string;
  mode: "classes" | "css";
  style: string;
  versionId: string | null;
}

interface TextStyleCreateResult {
  file: string;
  name: string;
  source: TextStyleSource;
  values: TextStyleValues;
  versionId: string | null;
}

const TEXT_STYLE_NAME = /^[a-z][a-z0-9-]{0,47}$/u;
const TEXT_STYLE_LIST_MAX = 100;
const TEXT_STYLE_LIST_DEFAULT = 40;
const TEXT_STYLE_QUERY_MAX = 80;
const TEXT_STYLE_VALUE_MAX = 200;

export {
  TEXT_STYLE_LIST_DEFAULT,
  TEXT_STYLE_LIST_MAX,
  TEXT_STYLE_NAME,
  TEXT_STYLE_PROPS,
  TEXT_STYLE_QUERY_MAX,
  TEXT_STYLE_SOURCES,
  TEXT_STYLE_VALUE_MAX,
};

export type {
  TextStyle,
  TextStyleApplyResult,
  TextStyleCreateResult,
  TextStyleList,
  TextStyleProp,
  TextStyleSource,
  TextStyleValues,
  TextStyleVars,
};
