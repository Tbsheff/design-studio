import type { IconSource } from "./deps.js";
import type { IconNode, SvgFrame } from "./svg.js";

interface IconSet {
  component: (name: string) => Promise<string | null>;
  frame: SvgFrame;
  importFrom: string | null;
  names: () => Promise<string[]>;
  nodes: (name: string) => Promise<IconNode[] | null>;
  resolve: (raw: string) => Promise<string | null>;
  source: IconSource;
}

class IconError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "IconError";
  }
}

const CAMEL_BREAK = /(?<lower>[a-z0-9])(?<upper>[A-Z])/gu;
const DIGIT_BREAK = /(?<letter>[A-Za-z])(?<digit>\d)/gu;
const ICON_PREFIX = /^Icon(?=[A-Z])/u;
const ICON_SUFFIX = /Icon$/u;
const PASCAL_START = /^[A-Z]/u;

const pascal = (name: string): string =>
  name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");

const kebabOf = (name: string): string =>
  name
    .replaceAll(CAMEL_BREAK, "$<lower>-$<upper>")
    .replaceAll(DIGIT_BREAK, "$<letter>-$<digit>")
    .toLowerCase();

const stripIcon = (name: string): string => {
  if (!PASCAL_START.test(name)) {
    return name;
  }

  return name.replace(ICON_PREFIX, "").replace(ICON_SUFFIX, "");
};

const nameKey = (raw: string): string => {
  const base = stripIcon(raw.trim());

  if (base.includes("-")) {
    return base.toLowerCase();
  }

  return kebabOf(base);
};

export { IconError, kebabOf, nameKey, pascal };

export type { IconSet };
