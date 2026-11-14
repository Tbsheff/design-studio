import { isMark, toCallArguments } from "./to-literal-value.js";
import type { LiteralEntry, LiteralValue } from "./to-literal-value.js";
import { toSourceTokens } from "./to-source-tokens.js";
import type { SourceToken } from "./to-source-tokens.js";

interface VariantOption {
  readonly classes: string;
  readonly name: string;
}

interface VariantGroup {
  readonly defaultOption: string | null;
  readonly name: string;
  readonly options: readonly VariantOption[];
}

interface ClassRecipe {
  readonly base: string;
  readonly groups: readonly VariantGroup[];
  readonly name: string;
}

interface ComponentRecipe {
  readonly base: string;
  readonly name: string;
  readonly recipe: ClassRecipe | null;
  readonly slot: string | null;
  readonly tag: string;
}

interface ComponentStart {
  readonly name: string;
  readonly start: number;
}

interface ClassUse {
  readonly base: string;
  readonly recipeName: string | null;
}

const SAFE_CLASS = /^[\w:/.%#()[\]='*&>,!@~+-]+$/u;
const SAFE_NAME = /^[A-Za-z][\w-]*$/u;
const COMPONENT_NAME = /^[A-Z][A-Za-z0-9]*$/u;
const HTML_TAG = /^[a-z][a-z0-9]*$/u;
const CLASS_JOINERS = new Set(["cn", "clsx", "cx", "twMerge", "classNames"]);
const MAX_CLASS_LENGTH = 160;
const MAX_CLASSES = 160;
const TAG_LOOKBACK = 400;
const SLOT_LOOKAHEAD = 40;
const NAME_OFFSET = 2;
const CALL_OFFSET = 3;
const DEFAULT_TAG = "div";

const toSafeClasses = (text: string): string =>
  text
    .split(/\s+/u)
    .filter(
      (item) =>
        item !== "" && item.length <= MAX_CLASS_LENGTH && SAFE_CLASS.test(item)
    )
    .slice(0, MAX_CLASSES)
    .join(" ");

const toJoinedTexts = (texts: readonly string[]): string =>
  texts.filter((text) => text !== "").join(" ");

const toClassText = (value: LiteralValue): string => {
  if (value.kind === "text") {
    return toSafeClasses(value.text);
  }

  if (value.kind === "list") {
    return toJoinedTexts(value.items.map((item) => toClassText(item)));
  }

  return "";
};

const toEntry = (
  entries: readonly LiteralEntry[],
  key: string
): LiteralValue | null =>
  entries.find((entry) => entry.key === key)?.value ?? null;

const toEntries = (value: LiteralValue | null): readonly LiteralEntry[] => {
  if (value === null || value.kind !== "record") {
    return [];
  }

  return value.entries.filter((entry) => SAFE_NAME.test(entry.key));
};

const toDefaultOption = (
  defaults: readonly LiteralEntry[],
  group: string
): string | null => {
  const value = toEntry(defaults, group);

  if (value === null || value.kind !== "text" || !SAFE_NAME.test(value.text)) {
    return null;
  }

  return value.text;
};

const toVariantGroups = (config: LiteralValue | null): VariantGroup[] => {
  const entries = toEntries(config);
  const defaults = toEntries(toEntry(entries, "defaultVariants"));

  return toEntries(toEntry(entries, "variants")).map((group) => ({
    defaultOption: toDefaultOption(defaults, group.key),
    name: group.key,
    options: toEntries(group.value).map((option) => ({
      classes: toClassText(option.value),
      name: option.key,
    })),
  }));
};

const toRecipeName = (
  tokens: readonly SourceToken[],
  index: number
): string => {
  const name = tokens[index - NAME_OFFSET];

  if (isMark(tokens[index - 1], "=") && name?.kind === "word") {
    return name.text;
  }

  return "recipe";
};

const toClassRecipes = (tokens: readonly SourceToken[]): ClassRecipe[] =>
  tokens.flatMap((token, index) => {
    if (token.kind !== "word" || token.text !== "cva") {
      return [];
    }

    if (!isMark(tokens[index + 1], "(")) {
      return [];
    }

    const [base, config] = toCallArguments(tokens, index + 1);

    return [
      {
        base: toClassText(base ?? { kind: "other", name: "" }),
        groups: toVariantGroups(config ?? null),
        name: toRecipeName(tokens, index),
      },
    ];
  });

const isComponentStart = (
  tokens: readonly SourceToken[],
  index: number
): boolean => {
  const keyword = tokens[index];
  const name = tokens[index + 1];

  if (keyword?.kind !== "word" || name?.kind !== "word") {
    return false;
  }

  if (!COMPONENT_NAME.test(name.text)) {
    return false;
  }

  if (keyword.text === "const") {
    return isMark(tokens[index + NAME_OFFSET], "=");
  }

  return (
    keyword.text === "function" && isMark(tokens[index + NAME_OFFSET], "(")
  );
};

const toBraceDepth = (token: SourceToken, depth: number): number => {
  if (isMark(token, "{")) {
    return depth + 1;
  }

  if (isMark(token, "}")) {
    return depth - 1;
  }

  return depth;
};

const toComponentStarts = (
  tokens: readonly SourceToken[]
): ComponentStart[] => {
  const starts: ComponentStart[] = [];
  let depth = 0;

  for (const [index, token] of tokens.entries()) {
    if (depth === 0 && isComponentStart(tokens, index)) {
      starts.push({ name: tokens[index + 1]?.text ?? "", start: index });
    }

    depth = toBraceDepth(token, depth);
  }

  return starts;
};

const toExportBlockNames = (
  tokens: readonly SourceToken[],
  index: number
): string[] => {
  if (!isMark(tokens[index + 1], "{")) {
    return [];
  }

  const end = tokens.findIndex((item, at) => at > index && isMark(item, "}"));

  return tokens.slice(index + 1, end).map((item) => item.text);
};

const toExportedNames = (tokens: readonly SourceToken[]): Set<string> =>
  new Set(
    tokens.flatMap((token, index) => {
      if (token.kind !== "word" || token.text !== "export") {
        return [];
      }

      return [
        ...toExportBlockNames(tokens, index),
        tokens[index + NAME_OFFSET]?.text ?? "",
      ];
    })
  );

const toUsedRecipe = (
  values: readonly LiteralValue[],
  recipeNames: ReadonlySet<string>
): string | null => {
  for (const value of values) {
    if (value.kind === "other" && recipeNames.has(value.name)) {
      return value.name;
    }
  }

  return null;
};

const toUse = (
  values: readonly LiteralValue[],
  recipeNames: ReadonlySet<string>
): ClassUse => ({
  base: toJoinedTexts(values.map((value) => toClassText(value))),
  recipeName: toUsedRecipe(values, recipeNames),
});

const toClassUse = (
  tokens: readonly SourceToken[],
  index: number,
  recipeNames: ReadonlySet<string>
): ClassUse | null => {
  const value = tokens[index + NAME_OFFSET];
  const joiner = tokens[index + CALL_OFFSET];

  if (value?.kind === "text" && value.isPlain) {
    return { base: toSafeClasses(value.text), recipeName: null };
  }

  if (!isMark(value, "{") || joiner?.kind !== "word") {
    return null;
  }

  if (!CLASS_JOINERS.has(joiner.text)) {
    return null;
  }

  if (!isMark(tokens[index + CALL_OFFSET + 1], "(")) {
    return null;
  }

  return toUse(toCallArguments(tokens, index + CALL_OFFSET + 1), recipeNames);
};

const toTagIndex = (tokens: readonly SourceToken[], index: number): number => {
  const floor = Math.max(0, index - TAG_LOOKBACK);

  for (let at = index - 1; at >= floor; at -= 1) {
    if (isMark(tokens[at], "<") && tokens[at + 1]?.kind === "word") {
      return at + 1;
    }
  }

  return -1;
};

const toSlotTag = (tokens: readonly SourceToken[], start: number): string => {
  const slot = tokens.findIndex(
    (token, at) =>
      at > start &&
      token.text === "Slot" &&
      isMark(tokens[at + 1], ":") &&
      tokens[at + NAME_OFFSET]?.kind === "text"
  );

  const tag = tokens[slot + NAME_OFFSET]?.text ?? "";

  if (slot !== -1 && HTML_TAG.test(tag)) {
    return tag;
  }

  return DEFAULT_TAG;
};

const toTag = (
  tokens: readonly SourceToken[],
  tagIndex: number,
  owner: ComponentStart
): string => {
  const tag = tokens[tagIndex]?.text ?? "";

  if (HTML_TAG.test(tag)) {
    return tag;
  }

  return toSlotTag(tokens, owner.start);
};

const toSlot = (
  tokens: readonly SourceToken[],
  tagIndex: number
): string | null => {
  const window = tokens.slice(tagIndex, tagIndex + SLOT_LOOKAHEAD);
  const at = window.findIndex((token) => token.text === "data-slot");
  const value = window[at + NAME_OFFSET];

  if (at === -1 || value?.kind !== "text" || !SAFE_NAME.test(value.text)) {
    return null;
  }

  return value.text;
};

const toOwner = (
  starts: readonly ComponentStart[],
  index: number
): ComponentStart | null =>
  starts.findLast((start) => start.start < index) ?? null;

interface SourceContext {
  readonly exported: ReadonlySet<string>;
  readonly recipeNames: ReadonlySet<string>;
  readonly recipes: readonly ClassRecipe[];
  readonly starts: readonly ComponentStart[];
  readonly tokens: readonly SourceToken[];
}

const isClassName = (tokens: readonly SourceToken[], index: number): boolean =>
  tokens[index]?.kind === "word" &&
  tokens[index]?.text === "className" &&
  isMark(tokens[index + 1], "=");

const toSlotNear = (
  tokens: readonly SourceToken[],
  tagIndex: number
): string | null => {
  if (tagIndex === -1) {
    return null;
  }

  return toSlot(tokens, tagIndex);
};

const toFoundComponent = (
  context: SourceContext,
  index: number,
  owner: ComponentStart
): ComponentRecipe | null => {
  const use = toClassUse(context.tokens, index, context.recipeNames);

  if (use === null || (use.base === "" && use.recipeName === null)) {
    return null;
  }

  const tagIndex = toTagIndex(context.tokens, index);

  return {
    base: use.base,
    name: owner.name,
    recipe:
      context.recipes.find((recipe) => recipe.name === use.recipeName) ?? null,
    slot: toSlotNear(context.tokens, tagIndex),
    tag: toTag(context.tokens, tagIndex, owner),
  };
};

const toKebabName = (name: string): string =>
  name.replaceAll(/(?<=[a-z0-9])(?=[A-Z])/gu, "-").toLowerCase();

const isOwnSlot = (component: ComponentRecipe | null): boolean =>
  component !== null && component.slot === toKebabName(component.name);

const toFoundComponents = (context: SourceContext): ComponentRecipe[] => {
  const found = new Map<string, ComponentRecipe>();

  for (const index of context.tokens.keys()) {
    const owner = toOwner(context.starts, index);
    const prior = found.get(owner?.name ?? "") ?? null;
    const isOpen = owner !== null && !isOwnSlot(prior);

    if (isOpen && isClassName(context.tokens, index)) {
      const component = toFoundComponent(context, index, owner);

      if (component !== null && (prior === null || isOwnSlot(component))) {
        found.set(owner.name, component);
      }
    }
  }

  return [...found.values()].filter(
    (component) =>
      context.exported.size === 0 || context.exported.has(component.name)
  );
};

const toLooseRecipes = (
  recipes: readonly ClassRecipe[],
  used: ReadonlySet<string | undefined>
): ComponentRecipe[] =>
  recipes.flatMap((item) => {
    if (used.has(item.name)) {
      return [];
    }

    return [
      { base: "", name: item.name, recipe: item, slot: null, tag: DEFAULT_TAG },
    ];
  });

const toComponentRecipes = (source: string): readonly ComponentRecipe[] => {
  const tokens = toSourceTokens(source);
  const recipes = toClassRecipes(tokens);
  const exported = toExportedNames(tokens);
  const recipeNames = new Set(recipes.map((recipe) => recipe.name));
  const starts = toComponentStarts(tokens);

  const components = toFoundComponents({
    exported,
    recipeNames,
    recipes,
    starts,
    tokens,
  });

  const used = new Set(components.map((component) => component.recipe?.name));

  return [...components, ...toLooseRecipes(recipes, used)];
};

export { toComponentRecipes, toSafeClasses };

export type { ClassRecipe, ComponentRecipe, VariantGroup, VariantOption };
