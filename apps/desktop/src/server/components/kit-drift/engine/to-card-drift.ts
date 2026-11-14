import { parse as parseHtml } from "parse5";
import type { DefaultTreeAdapterMap } from "parse5";

import { toClassTokens } from "./class-names.js";
import type { PackRecipe } from "./to-pack-recipes.js";

type HtmlNode = DefaultTreeAdapterMap["childNode"];

type HtmlElement = DefaultTreeAdapterMap["element"];

type CardSignal = "background" | "edge" | "padding" | "radius";

interface CardInput {
  readonly css: string;
  readonly html: string;
  readonly recipes: readonly PackRecipe[];
}

interface CardFind {
  readonly offset: number;
  readonly parts: readonly PackRecipe[];
  readonly recipe: PackRecipe;
  readonly tokens: readonly string[];
}

interface CssRule {
  readonly classes: readonly string[];
  readonly signals: readonly CardSignal[];
}

interface CardContext {
  readonly card: PackRecipe;
  readonly named: ReadonlyMap<string, PackRecipe>;
  readonly rules: readonly CssRule[];
}

const CARD_NAME = "Card";
const CARD_SLOT = "card";
const HEADING_PARTS = ["CardHeader", "CardTitle", "CardContent"];
const BODY_PARTS = ["CardContent"];
const MIN_CHILDREN = 2;
const SIGNAL_COUNT = 4;

const BLOCK_TAGS: ReadonlySet<string> = new Set([
  "article",
  "aside",
  "div",
  "li",
  "section",
]);

const SKIPPED_TAGS: ReadonlySet<string> = new Set([
  "script",
  "style",
  "table",
  "td",
  "template",
  "th",
]);

const HEADING_TAGS: ReadonlySet<string> = new Set([
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
]);

const FLAT_TOKENS: ReadonlySet<string> = new Set([
  "bg-inherit",
  "bg-none",
  "bg-transparent",
  "border-0",
  "border-collapse",
  "border-none",
  "border-separate",
  "border-transparent",
  "ring-0",
  "rounded-none",
  "shadow-none",
]);

const TOKEN_SIGNALS: readonly (readonly [CardSignal, RegExp])[] = [
  ["edge", /^(?:border|shadow|ring)(?:-(?!spacing).+)?$/u],
  ["radius", /^rounded(?:-.+)?$/u],
  ["background", /^bg-.+$/u],
  ["padding", /^p[xytrblse]?-(?!0$).+$/u],
];

const EMPTY_VALUE = /^(?:0|0px|none|transparent|initial|unset)$/iu;

const EDGE_PROPERTY =
  /^(?:box-shadow|border|border-(?:top|right|bottom|left|width|style)|outline)$/u;

const RADIUS_PROPERTY = /^border(?:-[a-z]+)*-radius$/u;
const BACKGROUND_PROPERTY = /^background(?:-color|-image)?$/u;
const COMMENT_PATTERN = /\/\*[\s\S]*?\*\//gu;
const CLASS_PATTERN = /\.(?<name>[\w-]+)/gu;
const COMBINATOR_PATTERN = /[\s>+~]+/u;

const isElement = (node: HtmlNode): node is HtmlElement => "tagName" in node;

const toAttribute = (element: HtmlElement, name: string): string | null =>
  element.attrs.find((attribute) => attribute.name === name)?.value ?? null;

const toDeclarationSignal = (
  property: string,
  value: string
): CardSignal | null => {
  if (value === "" || EMPTY_VALUE.test(value)) {
    return null;
  }

  if (RADIUS_PROPERTY.test(property)) {
    return "radius";
  }

  if (EDGE_PROPERTY.test(property)) {
    return "edge";
  }

  if (BACKGROUND_PROPERTY.test(property)) {
    return "background";
  }

  if (property.startsWith("padding")) {
    return "padding";
  }

  return null;
};

const listDeclarationSignals = (body: string): CardSignal[] =>
  body.split(";").flatMap((declaration) => {
    const colon = declaration.indexOf(":");

    if (colon === -1) {
      return [];
    }

    const property = declaration.slice(0, colon).trim().toLowerCase();

    const value = declaration
      .slice(colon + 1)
      .replace("!important", "")
      .trim();

    const signal = toDeclarationSignal(property, value);

    if (signal === null) {
      return [];
    }

    return [signal];
  });

const toRuleClasses = (selector: string): string[] => {
  const last = selector.trim().split(COMBINATOR_PATTERN).at(-1) ?? "";

  if (last.includes(":") || last.includes("[")) {
    return [];
  }

  return [...last.matchAll(CLASS_PATTERN)].map(
    (match) => match.groups?.name ?? ""
  );
};

const listBlockRules = (chunk: string): CssRule[] => {
  const open = chunk.lastIndexOf("{");

  if (open === -1) {
    return [];
  }

  const signals = listDeclarationSignals(chunk.slice(open + 1));
  const head = chunk.slice(0, open).split("{").at(-1) ?? "";

  if (signals.length === 0) {
    return [];
  }

  return head.split(",").flatMap((selector) => {
    const classes = toRuleClasses(selector);

    if (classes.length === 0) {
      return [];
    }

    return [{ classes, signals }];
  });
};

const listCssRules = (css: string): CssRule[] =>
  css
    .replaceAll(COMMENT_PATTERN, "")
    .split("}")
    .flatMap((chunk) => listBlockRules(chunk));

const toTokenSignals = (tokens: readonly string[]): CardSignal[] =>
  tokens.flatMap((token) => {
    if (token.includes(":") || FLAT_TOKENS.has(token)) {
      return [];
    }

    return TOKEN_SIGNALS.flatMap(([signal, pattern]) => {
      if (pattern.test(token)) {
        return [signal];
      }

      return [];
    });
  });

const toRuleSignals = (
  rules: readonly CssRule[],
  tokens: readonly string[]
): CardSignal[] => {
  const owned = new Set(tokens);

  return rules.flatMap((rule) => {
    if (rule.classes.every((name) => owned.has(name))) {
      return rule.signals;
    }

    return [];
  });
};

const isStyledCard = (
  context: CardContext,
  element: HtmlElement,
  tokens: readonly string[]
): boolean => {
  const signals = new Set([
    ...toTokenSignals(tokens),
    ...listDeclarationSignals(toAttribute(element, "style") ?? ""),
    ...toRuleSignals(context.rules, tokens),
  ]);

  return signals.size === SIGNAL_COUNT;
};

const isKitCard = (
  context: CardContext,
  element: HtmlElement,
  tokens: readonly string[]
): boolean => {
  const slot = context.card.slot ?? CARD_SLOT;
  const owned = new Set(tokens);
  const { base } = context.card.component;
  const shared = base.filter((token) => owned.has(token)).length;

  if (base.length === 0) {
    return toAttribute(element, "data-slot") === slot;
  }

  if (toAttribute(element, "data-slot") === slot) {
    return shared * 2 >= base.length;
  }

  return shared === base.length;
};

const listChildElements = (element: HtmlElement): HtmlElement[] =>
  element.childNodes.filter((child) => isElement(child));

const isHeadingFirst = (children: readonly HtmlElement[]): boolean => {
  const [first] = children;

  if (!first) {
    return false;
  }

  if (HEADING_TAGS.has(first.tagName)) {
    return true;
  }

  const [inner] = listChildElements(first);

  if (!inner) {
    return false;
  }

  return HEADING_TAGS.has(inner.tagName);
};

const toParts = (
  context: CardContext,
  children: readonly HtmlElement[]
): PackRecipe[] => {
  let parts = BODY_PARTS;

  if (isHeadingFirst(children)) {
    parts = HEADING_PARTS;
  }

  return parts.flatMap((name) => {
    const recipe = context.named.get(name) ?? null;

    if (recipe === null) {
      return [];
    }

    return [recipe];
  });
};

const listCardsIn = (context: CardContext, node: HtmlNode): CardFind[] => {
  if (!isElement(node) || SKIPPED_TAGS.has(node.tagName)) {
    return [];
  }

  const tokens = toClassTokens(toAttribute(node, "class") ?? "");
  const children = listChildElements(node);
  const isBlock = BLOCK_TAGS.has(node.tagName);

  if (isBlock && isKitCard(context, node, tokens)) {
    return [];
  }

  const offset = node.sourceCodeLocation?.startOffset ?? null;

  const isCard =
    isBlock &&
    children.length >= MIN_CHILDREN &&
    isStyledCard(context, node, tokens);

  if (isCard && offset !== null) {
    const parts = toParts(context, children);
    const recipe = context.card;

    return [{ offset, parts, recipe, tokens }];
  }

  return node.childNodes.flatMap((child) => listCardsIn(context, child));
};

const listStyleText = (node: HtmlNode): string[] => {
  if (!isElement(node)) {
    return [];
  }

  if (node.tagName === "style") {
    return node.childNodes.flatMap((child) => {
      if ("value" in child && child.nodeName === "#text") {
        return [child.value];
      }

      return [];
    });
  }

  return node.childNodes.flatMap((child) => listStyleText(child));
};

const toCardDrift = (input: CardInput): CardFind[] => {
  const card =
    input.recipes.find((recipe) => recipe.component.name === CARD_NAME) ?? null;

  if (card === null) {
    return [];
  }

  const document = parseHtml(input.html, { sourceCodeLocationInfo: true });

  const css = [
    input.css,
    ...document.childNodes.flatMap((node) => listStyleText(node)),
  ].join("\n");

  const context: CardContext = {
    card,
    named: new Map(
      input.recipes.map((recipe) => [recipe.component.name, recipe])
    ),
    rules: listCssRules(css),
  };

  return document.childNodes.flatMap((node) => listCardsIn(context, node));
};

export { toCardDrift };

export type { CardFind, CardInput };
