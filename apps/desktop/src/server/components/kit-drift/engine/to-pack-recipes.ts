import { toClassTokens } from "./class-names.js";
import type {
  KitComponent,
  KitVariantGroup,
  KitVariantOption,
} from "./types.js";

interface PackRecipe {
  readonly component: KitComponent;
  readonly slot: string | null;
  readonly source: string;
  readonly tag: string;
}

const SECTION_PATTERN = /^## (?<name>[A-Z][A-Za-z0-9]*)\s*$/mu;

const SOURCE_PATTERN =
  /^Source: `(?<source>[^`]*)`\. Element: `<(?<tag>[a-z][a-z0-9]*)>`\./mu;

const BASE_PATTERN = /Base classes:\s*```text\n(?<base>[^\n]*)\n```/u;

const GROUP_PATTERN =
  /^- `(?<prop>[\w-]+)` \(default `(?<fallback>[^`]*)`\):$/u;

const OPTION_PATTERN = /^ {2}- `(?<value>[\w-]+)`: `(?<classes>[^`]*)`$/u;

const SLOT_PATTERN = /```html\n<[a-z][a-z0-9]* data-slot="(?<slot>[\w-]+)"/u;

const NONE_TEXT = "(none)";
const NO_DEFAULT = "none";

const toClasses = (text: string): string => {
  if (text === NONE_TEXT) {
    return "";
  }

  return text;
};

const toDefault = (text: string): string | null => {
  if (text === NO_DEFAULT) {
    return null;
  }

  return text;
};

const toOption = (line: string): KitVariantOption | null => {
  const groups = OPTION_PATTERN.exec(line)?.groups ?? null;

  if (groups === null) {
    return null;
  }

  return {
    classes: toClasses(groups.classes ?? ""),
    value: groups.value ?? "",
  };
};

const toGroups = (section: string): KitVariantGroup[] => {
  const found: KitVariantGroup[] = [];

  for (const line of section.split("\n")) {
    const head = GROUP_PATTERN.exec(line)?.groups ?? null;
    const option = toOption(line);
    const last = found.at(-1) ?? null;

    if (head !== null) {
      found.push({
        default: toDefault(head.fallback ?? ""),
        options: [],
        prop: head.prop ?? "",
      });
    }

    if (head === null && option !== null && last !== null) {
      found[found.length - 1] = {
        ...last,
        options: [...last.options, option],
      };
    }
  }

  return found;
};

const toRecipe = (name: string, section: string): PackRecipe | null => {
  const head = SOURCE_PATTERN.exec(section)?.groups ?? null;

  if (head === null) {
    return null;
  }

  const base = toClassTokens(
    toClasses(BASE_PATTERN.exec(section)?.groups?.base ?? "")
  );

  const groups = toGroups(section);

  return {
    component: { base, groups, name },
    slot: SLOT_PATTERN.exec(section)?.groups?.slot ?? null,
    source: head.source ?? "",
    tag: head.tag ?? "",
  };
};

const toPackRecipes = (markdown: string): PackRecipe[] => {
  const parts = markdown.split(/^(?=## )/mu);

  return parts.flatMap((part) => {
    const name = SECTION_PATTERN.exec(part)?.groups?.name ?? null;

    if (name === null) {
      return [];
    }

    const recipe = toRecipe(name, part);

    if (recipe === null) {
      return [];
    }

    return [recipe];
  });
};

export { toPackRecipes };

export type { PackRecipe };
