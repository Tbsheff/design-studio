import { parse as parseHtml } from "parse5";
import type { DefaultTreeAdapterMap } from "parse5";

import { toClassTokens } from "./class-names.js";
import { toBadgeVariant } from "./to-badge-variant.js";
import type { ToneInput } from "./to-badge-variant.js";
import type { PackRecipe } from "./to-pack-recipes.js";

type HtmlNode = DefaultTreeAdapterMap["childNode"];

type HtmlElement = DefaultTreeAdapterMap["element"];

interface BadgeInput {
  readonly css: string;
  readonly html: string;
  readonly recipes: readonly PackRecipe[];
}

interface BadgeFind {
  readonly offset: number;
  readonly recipe: PackRecipe;
  readonly tokens: readonly string[];
  readonly variant: string;
}

interface CssRule {
  readonly classes: readonly string[];
  readonly declarations: readonly (readonly [string, string])[];
}

interface BadgeContext {
  readonly badge: PackRecipe;
  readonly rules: readonly CssRule[];
}

interface BadgeLook {
  readonly declarations: ReadonlyMap<string, string>;
  readonly tokens: readonly string[];
}

const BADGE_NAME = "Badge";
const BADGE_SLOT = "badge";
const BUTTON_SLOT = "button";
const MAX_WORDS = 3;
const MAX_CHARS = 24;
const MIN_FONT_PX = 12;
const MAX_FONT_PX = 14;
const REM_PX = 16;

const BADGE_TAGS: ReadonlySet<string> = new Set(["a", "div", "p", "span"]);

const SKIPPED_TAGS: ReadonlySet<string> = new Set([
  "button",
  "input",
  "script",
  "select",
  "style",
  "svg",
  "template",
  "textarea",
]);

const ICON_TAGS: ReadonlySet<string> = new Set(["i", "img", "svg"]);

const FLAT_TOKENS: ReadonlySet<string> = new Set([
  "bg-inherit",
  "bg-none",
  "bg-transparent",
  "border-0",
  "border-collapse",
  "border-none",
  "border-separate",
  "border-transparent",
  "outline-0",
  "outline-none",
  "ring-0",
  "rounded-none",
]);

const SMALL_TEXT_TOKENS: ReadonlySet<string> = new Set(["text-sm", "text-xs"]);

const RADIUS_TOKEN = /^rounded(?:-.+)?$/u;
const BACKGROUND_TOKEN = /^bg-.+$/u;
const EDGE_TOKEN = /^(?:border|ring|outline)(?:-(?!spacing).+)?$/u;
const PADDING_TOKEN = /^p[xlrse]?-(?!0$).+$/u;
const TEXT_SIZE_TOKEN = /^text-\[(?<size>[\d.]+(?:px|rem|em))\]$/u;
const SIZE_VALUE = /^(?<amount>[\d.]+)(?<unit>px|rem|em)$/u;
const EMPTY_VALUE = /^(?:0|0px|none|transparent|initial|unset)$/iu;
const RADIUS_PROPERTY = /^border(?:-[a-z]+)*-radius$/u;

const EDGE_PROPERTY =
  /^(?:border|border-(?:top|right|bottom|left|width|style|color)|outline|box-shadow)$/u;

const BACKGROUND_PROPERTY = /^background(?:-color|-image)?$/u;
const PADDING_PROPERTY = /^padding(?:-left|-right|-inline(?:-start|-end)?)?$/u;
const BUTTON_CLASS = /^(?:btn|button|cta)(?:[-_].*)?$|[-_](?:btn|button)$/u;
const COMMENT_PATTERN = /\/\*[\s\S]*?\*\//gu;
const CLASS_PATTERN = /\.(?<name>[\w-]+)/gu;
const COMBINATOR_PATTERN = /[\s>+~]+/u;
const SPACE_PATTERN = /\s+/u;

const isElement = (node: HtmlNode): node is HtmlElement => "tagName" in node;

const toAttribute = (element: HtmlElement, name: string): string | null =>
  element.attrs.find((attribute) => attribute.name === name)?.value ?? null;

const listDeclarations = (body: string): (readonly [string, string])[] =>
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

    if (property === "" || value === "" || EMPTY_VALUE.test(value)) {
      return [];
    }

    return [[property, value] as const];
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

  const declarations = listDeclarations(chunk.slice(open + 1));
  const head = chunk.slice(0, open).split("{").at(-1) ?? "";

  if (declarations.length === 0) {
    return [];
  }

  return head.split(",").flatMap((selector) => {
    const classes = toRuleClasses(selector);

    if (classes.length === 0) {
      return [];
    }

    return [{ classes, declarations }];
  });
};

const listCssRules = (css: string): CssRule[] =>
  css
    .replaceAll(COMMENT_PATTERN, "")
    .split("}")
    .flatMap((chunk) => listBlockRules(chunk));

const toLook = (context: BadgeContext, element: HtmlElement): BadgeLook => {
  const tokens = toClassTokens(toAttribute(element, "class") ?? "");
  const owned = new Set(tokens);
  const declarations = new Map<string, string>();

  for (const rule of context.rules) {
    if (rule.classes.every((name) => owned.has(name))) {
      for (const [property, value] of rule.declarations) {
        declarations.set(property, value);
      }
    }
  }

  for (const [property, value] of listDeclarations(
    toAttribute(element, "style") ?? ""
  )) {
    declarations.set(property, value);
  }

  return { declarations, tokens };
};

const isPlainToken = (token: string): boolean =>
  !token.includes(":") && !FLAT_TOKENS.has(token);

const hasToken = (look: BadgeLook, pattern: RegExp): boolean =>
  look.tokens.some((token) => isPlainToken(token) && pattern.test(token));

const hasProperty = (look: BadgeLook, pattern: RegExp): boolean =>
  [...look.declarations.keys()].some((property) => pattern.test(property));

const isSmallSize = (size: string): boolean => {
  const groups = SIZE_VALUE.exec(size.trim())?.groups ?? null;

  if (groups === null) {
    return false;
  }

  let pixels = Number(groups.amount);

  if (groups.unit !== "px") {
    pixels *= REM_PX;
  }

  return pixels >= MIN_FONT_PX && pixels <= MAX_FONT_PX;
};

const hasSmallText = (look: BadgeLook): boolean =>
  look.tokens.some(
    (token) =>
      SMALL_TEXT_TOKENS.has(token) ||
      isSmallSize(TEXT_SIZE_TOKEN.exec(token)?.groups?.size ?? "")
  ) || isSmallSize(look.declarations.get("font-size") ?? "");

const hasBackground = (look: BadgeLook): boolean =>
  hasToken(look, BACKGROUND_TOKEN) || hasProperty(look, BACKGROUND_PROPERTY);

const hasEdge = (look: BadgeLook): boolean =>
  hasToken(look, EDGE_TOKEN) || hasProperty(look, EDGE_PROPERTY);

const hasRadius = (look: BadgeLook): boolean =>
  hasToken(look, RADIUS_TOKEN) || hasProperty(look, RADIUS_PROPERTY);

const hasSidePadding = (look: BadgeLook): boolean =>
  hasToken(look, PADDING_TOKEN) || hasProperty(look, PADDING_PROPERTY);

const hasSurface = (look: BadgeLook): boolean =>
  hasBackground(look) || hasEdge(look);

const isPillStyled = (look: BadgeLook): boolean =>
  [hasRadius, hasSurface, hasSidePadding, hasSmallText].every((check) =>
    check(look)
  );

const toText = (node: HtmlNode): string => {
  if ("value" in node && node.nodeName === "#text") {
    return node.value;
  }

  if (!isElement(node)) {
    return "";
  }

  return node.childNodes.map((child) => toText(child)).join(" ");
};

const isIcon = (element: HtmlElement): boolean =>
  ICON_TAGS.has(element.tagName) || toText(element).trim() === "";

const isShortText = (element: HtmlElement): boolean => {
  const text = toText(element).trim();
  const words = text.split(SPACE_PATTERN);
  const children = element.childNodes.filter((child) => isElement(child));

  const isShort =
    text !== "" && text.length <= MAX_CHARS && words.length <= MAX_WORDS;

  return (
    isShort && children.length <= 1 && children.every((child) => isIcon(child))
  );
};

const isKitBadge = (context: BadgeContext, element: HtmlElement): boolean => {
  const slot = context.badge.slot ?? BADGE_SLOT;

  if (toAttribute(element, "data-slot") === slot) {
    return true;
  }

  const owned = new Set(toClassTokens(toAttribute(element, "class") ?? ""));
  const { base } = context.badge.component;

  return base.length > 0 && base.every((token) => owned.has(token));
};

const isLinkButton = (element: HtmlElement): boolean =>
  element.tagName === "a" &&
  (toAttribute(element, "data-slot") === BUTTON_SLOT ||
    toAttribute(element, "role") === BUTTON_SLOT ||
    toClassTokens(toAttribute(element, "class") ?? "").some((token) =>
      BUTTON_CLASS.test(token)
    ));

const isSkipped = (context: BadgeContext, element: HtmlElement): boolean =>
  SKIPPED_TAGS.has(element.tagName) ||
  isLinkButton(element) ||
  isKitBadge(context, element);

const toFind = (
  context: BadgeContext,
  element: HtmlElement,
  look: BadgeLook
): BadgeFind | null => {
  const offset = element.sourceCodeLocation?.startOffset ?? null;

  if (offset === null) {
    return null;
  }

  const tone: ToneInput = {
    declarations: look.declarations,
    hasBackground: hasBackground(look),
    hasEdge: hasEdge(look),
    tokens: look.tokens,
  };

  const recipe = context.badge;
  const { tokens } = look;
  const variant = toBadgeVariant(recipe.component, tone);

  return { offset, recipe, tokens, variant };
};

const listBadgesIn = (context: BadgeContext, node: HtmlNode): BadgeFind[] => {
  if (!isElement(node) || isSkipped(context, node)) {
    return [];
  }

  const look = toLook(context, node);

  if (BADGE_TAGS.has(node.tagName) && isShortText(node) && isPillStyled(look)) {
    const find = toFind(context, node, look);

    if (find !== null) {
      return [find];
    }
  }

  return node.childNodes.flatMap((child) => listBadgesIn(context, child));
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

const isJudgeable = (recipe: PackRecipe): boolean =>
  recipe.slot !== null || recipe.component.base.length > 0;

const toBadgeDrift = (input: BadgeInput): BadgeFind[] => {
  const badge =
    input.recipes.find((recipe) => recipe.component.name === BADGE_NAME) ??
    null;

  if (badge === null || !isJudgeable(badge)) {
    return [];
  }

  const document = parseHtml(input.html, { sourceCodeLocationInfo: true });

  const css = [
    input.css,
    ...document.childNodes.flatMap((node) => listStyleText(node)),
  ].join("\n");

  const context: BadgeContext = { badge, rules: listCssRules(css) };

  return document.childNodes.flatMap((node) => listBadgesIn(context, node));
};

export { isPillStyled, toBadgeDrift };

export type { BadgeFind, BadgeInput, BadgeLook };
