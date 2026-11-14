import { parse as parseHtml } from "parse5";
import type { DefaultTreeAdapterMap } from "parse5";

import { toClassTokens } from "./class-names.js";
import { toDriftId } from "./to-drift-id.js";
import type { PackRecipe } from "./to-pack-recipes.js";
import type {
  ChildKind,
  DriftConfidence,
  DriftMatch,
  DriftSkipReason,
  KitComponent,
  RawAttribute,
  RawElement,
} from "./types.js";

type HtmlNode = DefaultTreeAdapterMap["childNode"];

type HtmlElement = DefaultTreeAdapterMap["element"];

interface SkeletonPlan {
  readonly dropped: readonly string[];
  readonly kept: readonly string[];
}

interface SkeletonInput {
  readonly html: string;
  readonly recipes: readonly PackRecipe[];
}

interface SkeletonFind {
  readonly confidence: DriftConfidence;
  readonly offset: number;
  readonly recipe: PackRecipe;
  readonly tokens: readonly string[];
}

const SKELETON_NAME = "Skeleton";
const SKELETON_SLOT = "skeleton";
const PULSE_TOKEN = "animate-pulse";
const DARK_PREFIX = "dark:";

const BLOCK_TAGS: ReadonlySet<string> = new Set(["div", "span"]);

const MUTED_PATTERN =
  /^bg-(?:(?:muted|accent)|(?:gray|slate|zinc|neutral|stone)-\d+)(?:\/\d+)?$/u;

const isMutedToken = (token: string): boolean =>
  MUTED_PATTERN.test(token) ||
  (token.startsWith(DARK_PREFIX) &&
    MUTED_PATTERN.test(token.slice(DARK_PREFIX.length)));

const isSkeletonTokens = (tokens: readonly string[]): boolean =>
  tokens.includes(PULSE_TOKEN) && tokens.some((token) => isMutedToken(token));

const toSkeletonPlan = (
  kit: KitComponent,
  tokens: readonly string[]
): SkeletonPlan => {
  const base = new Set(kit.base);

  const isDropped = (token: string): boolean =>
    base.has(token) || token === PULSE_TOKEN || isMutedToken(token);

  return {
    dropped: tokens.filter((token) => isDropped(token)),
    kept: tokens.filter((token) => !isDropped(token)),
  };
};

const toConfidence = (kind: ChildKind): DriftConfidence => {
  if (kind === "empty") {
    return "high";
  }

  return "medium";
};

const toSkip = (element: RawElement): DriftSkipReason | null => {
  if (element.attributes.some((attribute) => attribute.kind === "spread")) {
    return "spread-props";
  }

  if (element.childKind === "elements") {
    return "needs-parts";
  }

  return null;
};

const getClassName = (element: RawElement): RawAttribute | null =>
  element.attributes.find((attribute) => attribute.name === "className") ??
  null;

const toSkeletonMatch = (
  file: string,
  kit: ReadonlyMap<string, KitComponent>,
  element: RawElement
): DriftMatch[] => {
  const kitComponent = kit.get(SKELETON_NAME) ?? null;
  const className = getClassName(element);

  if (
    kitComponent === null ||
    !BLOCK_TAGS.has(element.tag) ||
    className?.kind !== "string" ||
    element.childKind === "text"
  ) {
    return [];
  }

  const tokens = toClassTokens(className.text);

  if (!isSkeletonTokens(tokens)) {
    return [];
  }

  const plan = toSkeletonPlan(kitComponent, tokens);
  const { column, line } = element;
  const confidence = toConfidence(element.childKind);
  const droppedClasses = plan.dropped;
  const id = toDriftId(file, line, column);
  const keptClasses = plan.kept;
  const skip = toSkip(element);
  const component = SKELETON_NAME;
  const setSize = null;
  const setVariant = null;
  const suggestedSize = null;
  const suggestedVariant = null;
  const tag = "skeleton";

  return [
    {
      className,
      column,
      component,
      confidence,
      droppedClasses,
      element,
      file,
      id,
      keptClasses,
      line,
      setSize,
      setVariant,
      skip,
      suggestedSize,
      suggestedVariant,
      tag,
    },
  ];
};

const isElement = (node: HtmlNode): node is HtmlElement => "tagName" in node;

const toAttribute = (element: HtmlElement, name: string): string | null =>
  element.attrs.find((attribute) => attribute.name === name)?.value ?? null;

const isTextNode = (node: HtmlNode): boolean =>
  node.nodeName === "#text" && "value" in node && node.value.trim() !== "";

const toHtmlKind = (element: HtmlElement): ChildKind => {
  if (element.childNodes.some((child) => isTextNode(child))) {
    return "text";
  }

  if (element.childNodes.some((child) => isElement(child))) {
    return "elements";
  }

  return "empty";
};

const toHtmlFind = (
  recipe: PackRecipe,
  element: HtmlElement
): SkeletonFind | null => {
  const tokens = toClassTokens(toAttribute(element, "class") ?? "");
  const kind = toHtmlKind(element);
  const offset = element.sourceCodeLocation?.startOffset ?? null;

  const isBlock =
    BLOCK_TAGS.has(element.tagName) &&
    toAttribute(element, "data-slot") !== SKELETON_SLOT;

  if (!isBlock || kind === "text" || !isSkeletonTokens(tokens)) {
    return null;
  }

  if (offset === null) {
    return null;
  }

  return { confidence: toConfidence(kind), offset, recipe, tokens };
};

const listHtmlFinds = (
  recipe: PackRecipe,
  nodes: readonly HtmlNode[]
): SkeletonFind[] =>
  nodes.flatMap((node) => {
    if (!isElement(node)) {
      return [];
    }

    const find = toHtmlFind(recipe, node);
    const nested = listHtmlFinds(recipe, node.childNodes);

    if (find === null) {
      return nested;
    }

    return [find, ...nested];
  });

const toSkeletonFinds = (input: SkeletonInput): SkeletonFind[] => {
  const recipe =
    input.recipes.find((entry) => entry.component.name === SKELETON_NAME) ??
    null;

  if (recipe === null || !input.html.includes(PULSE_TOKEN)) {
    return [];
  }

  const document = parseHtml(input.html, { sourceCodeLocationInfo: true });

  return listHtmlFinds(recipe, document.childNodes);
};

export { toSkeletonFinds, toSkeletonMatch, toSkeletonPlan };

export type { SkeletonFind, SkeletonInput, SkeletonPlan };
