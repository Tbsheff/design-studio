import { parseClass } from "./deps.js";
import type { TailwindTheme, TextStyle, TextStyleProp } from "./deps.js";

interface ClassChanges {
  add: string[];
  remove: string[];
}

const PLAIN_VALUE = /^[^\s,'"]+$/u;

const SIZE_ARBITRARY =
  /^\[(?:length:|\d|\.|calc|clamp|min|max|var\(--(?:text|font-size|fs))/u;

const TEXT_PREFIX = "text-";
const FONT_PREFIX = "font-";
const FREE_PREFIXES = ["leading-", "tracking-"];

const PREFIX: Record<TextStyleProp, string> = {
  family: "font",
  letterSpacing: "tracking",
  lineHeight: "leading",
  size: "text",
  weight: "font",
};

const NAMESPACE: Record<TextStyleProp, string> = {
  family: "font",
  letterSpacing: "tracking",
  lineHeight: "leading",
  size: "text",
  weight: "font-weight",
};

const ARBITRARY_KIND: Record<TextStyleProp, string> = {
  family: "family-name:",
  letterSpacing: "length:",
  lineHeight: "length:",
  size: "length:",
  weight: "",
};

const PROPS: TextStyleProp[] = [
  "size",
  "weight",
  "lineHeight",
  "letterSpacing",
  "family",
];

const textConflict = (rest: string, theme: TailwindTheme): boolean => {
  if (rest.startsWith("[")) {
    return SIZE_ARBITRARY.test(rest);
  }

  const [key = ""] = rest.split("/");

  return theme.text.has(key);
};

const fontConflict = (rest: string, theme: TailwindTheme): boolean =>
  rest.startsWith("[") || theme.fontWeight.has(rest) || theme.font.has(rest);

const isConflict = (raw: string, theme: TailwindTheme): boolean => {
  const { utility, variants } = parseClass(raw);

  if (variants !== "") {
    return false;
  }

  if (FREE_PREFIXES.some((prefix) => utility.startsWith(prefix))) {
    return true;
  }

  if (utility.startsWith(TEXT_PREFIX)) {
    return textConflict(utility.slice(TEXT_PREFIX.length), theme);
  }

  if (utility.startsWith(FONT_PREFIX)) {
    return fontConflict(utility.slice(FONT_PREFIX.length), theme);
  }

  return false;
};

const themeClass = (
  style: TextStyle,
  prop: TextStyleProp,
  theme: TailwindTheme
): string | null => {
  const name = style.vars[prop] ?? "";
  const spot = theme.vars.get(name);

  if (spot?.ns !== NAMESPACE[prop]) {
    return null;
  }

  if (spot.name === "") {
    return PREFIX[prop];
  }

  return `${PREFIX[prop]}-${spot.name}`;
};

const weightClass = (value: string, theme: TailwindTheme): string => {
  const number = Number(value);

  for (const [key, weight] of theme.fontWeight) {
    if (weight === number) {
      return `font-${key}`;
    }
  }

  return `font-[${value}]`;
};

const arbitraryClass = (
  style: TextStyle,
  prop: TextStyleProp,
  theme: TailwindTheme
): string | null => {
  const value = style[prop];
  const name = style.vars[prop];

  if (name) {
    return `${PREFIX[prop]}-[${ARBITRARY_KIND[prop]}var(${name})]`;
  }

  if (value && prop === "weight") {
    return weightClass(value, theme);
  }

  if (value && PLAIN_VALUE.test(value) && prop !== "family") {
    return `${PREFIX[prop]}-[${value}]`;
  }

  return null;
};

const sizeCarriesPairs = (style: TextStyle, theme: TailwindTheme): boolean =>
  style.source === "tailwind-theme" &&
  themeClass(style, "size", theme) !== null;

const wantsClass = (
  style: TextStyle,
  prop: TextStyleProp,
  paired: boolean
): boolean => {
  if (style[prop] === null) {
    return false;
  }

  return !paired || prop === "size" || prop === "family";
};

const styleClasses = (style: TextStyle, theme: TailwindTheme): string[] => {
  const paired = sizeCarriesPairs(style, theme);
  const out: string[] = [];

  for (const prop of PROPS) {
    const cls =
      wantsClass(style, prop, paired) &&
      (themeClass(style, prop, theme) ?? arbitraryClass(style, prop, theme));

    if (cls) {
      out.push(cls);
    }
  }

  return out;
};

const planClassChanges = (
  style: TextStyle,
  current: string[],
  theme: TailwindTheme
): ClassChanges => {
  const add = styleClasses(style, theme);
  const keep = new Set(add);
  const present = new Set(current);

  const remove = current.filter(
    (raw) => !keep.has(raw) && isConflict(raw, theme)
  );

  return { add: add.filter((cls) => !present.has(cls)), remove };
};

export { planClassChanges };

export type { ClassChanges };
