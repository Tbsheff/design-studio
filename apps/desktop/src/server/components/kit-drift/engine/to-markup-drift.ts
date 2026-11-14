import { toClassTokens } from "./class-names.js";
import { toDriftId } from "./to-drift-id.js";
import type { PackRecipe } from "./to-pack-recipes.js";
import type { DriftConfidence, DriftTag, KitComponent } from "./types.js";

interface MarkupInput {
  readonly file: string;
  readonly html: string;
  readonly recipes: readonly PackRecipe[];
}

interface MarkupDrift {
  readonly column: number;
  readonly confidence: DriftConfidence;
  readonly droppedClasses: readonly string[];
  readonly file: string;
  readonly id: string;
  readonly keptClasses: readonly string[];
  readonly line: number;
  readonly recipe: PackRecipe;
  readonly suggestedSize: string | null;
  readonly suggestedVariant: string | null;
  readonly tag: DriftTag;
}

interface MarkupPlace {
  readonly column: number;
  readonly line: number;
}

interface MarkupElement {
  readonly attributes: ReadonlyMap<string, string>;
  readonly offset: number;
  readonly tag: string;
}

const HIDDEN_BLOCK_PATTERN =
  /<!--[\s\S]*?-->|<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>/giu;

const TAG_PATTERN =
  /<(?<tag>a|button|input|label|select|table|textarea)(?=[\s/>])(?<rest>[^>]*)>/giu;

const ATTRIBUTE_PATTERN =
  /(?<name>[^\s=/>"']+)(?:\s*=\s*(?:"(?<double>[^"]*)"|'(?<single>[^']*)'|(?<bare>[^\s>"']+)))?/gu;

const BUTTON_CLASS_PATTERN =
  /^(?:btn|button|cta)(?:[-_].*)?$|[-_](?:btn|button)$/u;

const PLAIN_TAGS: ReadonlySet<string> = new Set([
  "button",
  "label",
  "select",
  "table",
  "textarea",
]);

const isPlainTag = (tag: string): tag is DriftTag => PLAIN_TAGS.has(tag);

const TEXT_INPUT_TYPES: ReadonlySet<string> = new Set([
  "date",
  "email",
  "number",
  "password",
  "search",
  "tel",
  "text",
  "time",
  "url",
]);

const COMPONENT_NAMES: Readonly<Record<DriftTag, ReadonlySet<string>>> = {
  "a-as-button": new Set(["Button"]),
  button: new Set(["Button"]),
  input: new Set(["Input"]),
  label: new Set(["Label"]),
  select: new Set(["NativeSelect", "Select"]),
  table: new Set(["Table"]),
  textarea: new Set(["Textarea"]),
};

const VARIANT_PROP = "variant";
const SIZE_PROP = "size";

const toBlanked = (html: string): string =>
  html.replaceAll(HIDDEN_BLOCK_PATTERN, (block) =>
    block.replaceAll(/[^\n]/gu, " ")
  );

const toAttributes = (rest: string): Map<string, string> => {
  const found = new Map<string, string>();

  for (const match of rest.matchAll(ATTRIBUTE_PATTERN)) {
    const { bare, double, name, single } = match.groups ?? {};

    if ((name ?? "") !== "") {
      found.set((name ?? "").toLowerCase(), double ?? single ?? bare ?? "");
    }
  }

  return found;
};

const listElements = (html: string): MarkupElement[] =>
  [...toBlanked(html).matchAll(TAG_PATTERN)].map((match) => ({
    attributes: toAttributes(match.groups?.rest ?? ""),
    offset: match.index,
    tag: (match.groups?.tag ?? "").toLowerCase(),
  }));

const toClassList = (element: MarkupElement): string[] =>
  toClassTokens(element.attributes.get("class") ?? "");

const isLinkButton = (element: MarkupElement): boolean =>
  element.attributes.has("href") &&
  (element.attributes.get("data-slot") === "button" ||
    toClassList(element).some((token) => BUTTON_CLASS_PATTERN.test(token)));

const toTag = (element: MarkupElement): DriftTag | null => {
  if (element.tag === "a") {
    if (isLinkButton(element)) {
      return "a-as-button";
    }

    return null;
  }

  if (element.tag === "input") {
    const type = (element.attributes.get("type") ?? "text").toLowerCase();

    if (TEXT_INPUT_TYPES.has(type)) {
      return "input";
    }

    return null;
  }

  if (isPlainTag(element.tag)) {
    return element.tag;
  }

  return null;
};

const getRecipe = (
  recipes: readonly PackRecipe[],
  tag: DriftTag
): PackRecipe | null =>
  recipes.find((recipe) => COMPONENT_NAMES[tag].has(recipe.component.name)) ??
  null;

const isJudgeable = (recipe: PackRecipe): boolean =>
  recipe.slot !== null || recipe.component.base.length > 0;

const isKitStyled = (recipe: PackRecipe, element: MarkupElement): boolean => {
  if (
    recipe.slot !== null &&
    element.attributes.get("data-slot") === recipe.slot
  ) {
    return true;
  }

  const tokens = new Set(toClassList(element));
  const { base } = recipe.component;

  return base.length > 0 && base.every((token) => tokens.has(token));
};

const toDefaultOf = (kit: KitComponent, prop: string): string | null =>
  kit.groups.find((group) => group.prop === prop)?.default ?? null;

const toRecipeClasses = (kit: KitComponent): Set<string> => {
  const found = new Set<string>(kit.base);

  for (const group of kit.groups) {
    const chosen = group.options.find(
      (option) => option.value === group.default
    );

    for (const token of toClassTokens(chosen?.classes ?? "")) {
      found.add(token);
    }
  }

  return found;
};

const toPlace = (html: string, offset: number): MarkupPlace => {
  const before = html.slice(0, offset);
  const line = before.split("\n").length;
  const column = offset - before.lastIndexOf("\n");

  return { column, line };
};

const toConfidence = (tag: DriftTag): DriftConfidence => {
  if (tag === "a-as-button") {
    return "medium";
  }

  return "high";
};

const toElementDrift = (
  input: MarkupInput,
  element: MarkupElement
): MarkupDrift[] => {
  const tag = toTag(element);

  if (tag === null) {
    return [];
  }

  const recipe = getRecipe(input.recipes, tag);

  if (recipe === null || !isJudgeable(recipe) || isKitStyled(recipe, element)) {
    return [];
  }

  const covered = toRecipeClasses(recipe.component);
  const tokens = toClassList(element);
  const { column, line } = toPlace(input.html, element.offset);
  const confidence = toConfidence(tag);
  const droppedClasses = tokens.filter((token) => covered.has(token));
  const { file } = input;
  const id = toDriftId(file, line, column);
  const keptClasses = tokens.filter((token) => !covered.has(token));
  const suggestedSize = toDefaultOf(recipe.component, SIZE_PROP);
  const suggestedVariant = toDefaultOf(recipe.component, VARIANT_PROP);

  return [
    {
      column,
      confidence,
      droppedClasses,
      file,
      id,
      keptClasses,
      line,
      recipe,
      suggestedSize,
      suggestedVariant,
      tag,
    },
  ];
};

const toMarkupDrift = (input: MarkupInput): MarkupDrift[] =>
  listElements(input.html).flatMap((element) => toElementDrift(input, element));

export { toMarkupDrift };

export type { MarkupDrift, MarkupInput };
