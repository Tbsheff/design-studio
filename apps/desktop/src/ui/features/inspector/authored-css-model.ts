import { DIRECT_STYLE_PROPERTIES } from "@design-studio/contracts";
import type { AuthoredRule } from "@design-studio/contracts";

import { isText } from "../../platform/json-guard.js";

interface AuthoredCss {
  readonly rules: AuthoredRule[];
  readonly inline: string;
}

interface AuthoredDeclaration {
  readonly prop: string;
  readonly value: string;
  readonly source: string;
}

const MAX_RULES = 60;
const MAX_BYTES = 20_000;
const MAX_SELECTOR = 2000;
const MAX_SOURCE = 200;
const MAX_PATH = 20;
const MAX_CRUMBS = 4;
const MAX_LABEL = 60;
const INLINE_SOURCE = "inline";

const COVERED = new Set<string>([
  ...DIRECT_STYLE_PROPERTIES,
  "padding",
  "padding-block",
  "padding-inline",
  "padding-block-start",
  "padding-block-end",
  "padding-inline-start",
  "padding-inline-end",
  "margin",
  "margin-block",
  "margin-inline",
  "margin-block-start",
  "margin-block-end",
  "margin-inline-start",
  "margin-inline-end",
  "border",
  "font",
  "background-color",
  "row-gap",
  "column-gap",
  "grid-gap",
  "grid-row-gap",
  "grid-column-gap",
  "flex-grow",
  "flex-shrink",
  "flex-basis",
  "flex-flow",
]);

const NOT_BORDER_BOX = /^border-(?:collapse|spacing|image)/u;

const IMAGE_VALUE =
  /(?:url|gradient|image|image-set|element|cross-fade|paint)\s*\(/iu;

const IMPORTANT_TAIL = /!important\s*$/iu;

const COMMENT_PATTERN = /\/\*[\s\S]*?\*\//gu;

interface RawRule {
  readonly selector?: string | number;
  readonly css?: string | number;
  readonly source?: string | number | null;
}

interface AuthoredReplyMessage {
  readonly rules?: (RawRule | null)[] | string;
  readonly inline?: string | number;
}

type RawPath = (string | number)[] | string | null;

interface PathCrumb {
  readonly label: string;
  readonly levels: number;
}

type Crumb =
  | ({ readonly kind: "node" } & PathCrumb)
  | { readonly kind: "gap"; readonly hidden: PathCrumb[] };

const toQuoteAfter = (char: string, quote: string): string | null => {
  if (char === quote) {
    return null;
  }

  return quote;
};

const toDepthAfter = (depth: number, char: string): number => {
  if (char === "(") {
    return depth + 1;
  }

  if (char === ")") {
    return Math.max(0, depth - 1);
  }

  return depth;
};

const isQuoteChar = (char: string): boolean => char === '"' || char === "'";

const toTopLevelParts = (
  text: string,
  separator: string,
  limit: number
): string[] => {
  const parts: string[] = [];
  let quote: string | null = null;
  let depth = 0;
  let start = 0;

  for (let index = 0; index < text.length; index += 1) {
    const char = text.charAt(index);

    if (quote === null) {
      if (isQuoteChar(char)) {
        quote = char;
      }

      depth = toDepthAfter(depth, char);

      if (char === separator && depth === 0 && parts.length < limit) {
        parts.push(text.slice(start, index));
        start = index + 1;
      }
    } else if (char === "\\") {
      index += 1;
    } else {
      quote = toQuoteAfter(char, quote);
    }
  }

  parts.push(text.slice(start));

  return parts;
};

const toPropName = (prop: string): string => {
  if (prop.startsWith("--")) {
    return prop;
  }

  return prop.toLowerCase();
};

const toDeclarations = (
  css: string
): { readonly prop: string; readonly value: string }[] => {
  const out: { readonly prop: string; readonly value: string }[] = [];

  for (const chunk of toTopLevelParts(
    css.replaceAll(COMMENT_PATTERN, ""),
    ";",
    Infinity
  )) {
    const [rawProp = "", rawValue = ""] = toTopLevelParts(chunk, ":", 1);
    const prop = rawProp.trim();
    const value = rawValue.trim();

    if (prop !== "" && value !== "") {
      out.push({ prop: toPropName(prop), value });
    }
  }

  return out;
};

const isColorOnly = (value: string): boolean => {
  const plain = value.replace(IMPORTANT_TAIL, "").trim();

  return (
    !IMAGE_VALUE.test(plain) &&
    toTopLevelParts(plain, " ", Infinity).filter((part) => part !== "")
      .length === 1
  );
};

const isCoveredDeclaration = (prop: string, value: string): boolean => {
  if (prop === "background") {
    return isColorOnly(value);
  }

  if (COVERED.has(prop)) {
    return true;
  }

  return prop.startsWith("border-") && !NOT_BORDER_BOX.test(prop);
};

const toOtherStyles = (css: AuthoredCss): AuthoredDeclaration[] => {
  const winners = new Map<string, AuthoredDeclaration>();

  const take = (text: string, source: string): void => {
    for (const { prop, value } of toDeclarations(text)) {
      if (!isCoveredDeclaration(prop, value)) {
        winners.delete(prop);
        winners.set(prop, { prop, source, value });
      }
    }
  };

  for (const rule of css.rules) {
    take(rule.css, rule.source ?? rule.selector);
  }

  take(css.inline, INLINE_SOURCE);

  return [...winners.values()];
};

const toBlock = (head: string, css: string): string => {
  const lines = toDeclarations(css).map(
    ({ prop, value }) => `  ${prop}: ${value};`
  );

  return `${head} {\n${lines.join("\n")}\n}`;
};

const toCopyCss = (css: AuthoredCss): string => {
  const blocks = css.rules.map((rule) => toBlock(rule.selector, rule.css));

  if (toDeclarations(css.inline).length > 0) {
    blocks.push(toBlock("/* inline */", css.inline));
  }

  return blocks.join("\n\n");
};

const toCappedString = (
  value: string | number | null,
  max: number
): string | null => {
  if (isText(value) && value.length <= max) {
    return value;
  }

  return null;
};

const toAuthoredRule = (raw: RawRule | null): AuthoredRule | null => {
  if (!raw) {
    return null;
  }

  const selector = toCappedString(raw.selector ?? null, MAX_SELECTOR);
  const css = toCappedString(raw.css ?? null, MAX_BYTES);
  const rawSource = raw.source ?? null;
  const source = toCappedString(rawSource, MAX_SOURCE);

  if (selector === null || css === null) {
    return null;
  }

  if (source === null && rawSource !== null) {
    return null;
  }

  return { css, selector, source };
};

const toAuthoredReply = (message: AuthoredReplyMessage): AuthoredCss | null => {
  const inline = toCappedString(message.inline ?? null, MAX_BYTES);

  if (!Array.isArray(message.rules) || inline === null) {
    return null;
  }

  const rules: AuthoredRule[] = [];
  let bytes = 0;

  for (const raw of message.rules.slice(0, MAX_RULES)) {
    const rule = toAuthoredRule(raw);

    if (rule) {
      bytes += rule.selector.length + rule.css.length;

      if (bytes > MAX_BYTES) {
        break;
      }

      rules.push(rule);
    }
  }

  return { inline, rules };
};

const toSelectionPath = (raw: RawPath): string[] => {
  if (!Array.isArray(raw)) {
    return [];
  }

  const path = raw.slice(-MAX_PATH);

  if (!path.every((label): label is string => isText(label) && label !== "")) {
    return [];
  }

  return path.map((label) => label.slice(0, MAX_LABEL));
};

const toPathCrumbs = (path: string[]): PathCrumb[] =>
  path.map((label, index) => ({ label, levels: path.length - index }));

const toLimitedCrumbs = (crumbs: PathCrumb[], max: number): Crumb[] => {
  const nodes = crumbs.map((crumb): Crumb => ({ kind: "node", ...crumb }));

  if (crumbs.length <= max) {
    return nodes;
  }

  const keep = max - 1;

  return [
    nodes[0] as Crumb,
    { hidden: crumbs.slice(1, crumbs.length - keep), kind: "gap" },
    ...nodes.slice(crumbs.length - keep),
  ];
};

const toCollapsedCrumbs = (crumbs: PathCrumb[]): Crumb[] =>
  toLimitedCrumbs(crumbs, MAX_CRUMBS);

export {
  INLINE_SOURCE,
  MAX_BYTES,
  MAX_RULES,
  isCoveredDeclaration,
  toAuthoredReply,
  toCollapsedCrumbs,
  toCopyCss,
  toDeclarations,
  toOtherStyles,
  toPathCrumbs,
  toSelectionPath,
};

export type { AuthoredCss, AuthoredDeclaration, Crumb, PathCrumb };
