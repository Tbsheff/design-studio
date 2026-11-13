import type { PackDarkMode, TokenFile } from "@design-studio/contracts";
import { Schema } from "effect";

import { maskComments } from "../app-tokens/read-css.js";
import type { CssTokenSheet } from "../app-tokens/read-css.js";
import { toParser } from "../parse-schema.js";

interface DarkModeField {
  readonly darkMode?: PackDarkMode;
}

const DARK_MODE_EXTENSION = "studio.darkMode";

const DARK_MEDIA = /@media[^{;]*prefers-color-scheme\s*:\s*dark/iu;

const DARK_VARIANT = /@custom-variant\s+dark\s*\((?<variant>[^;]*)\)\s*;/iu;

const SELECTOR_TEXT = String.raw`\.[A-Za-z][\w-]*|\[data-[\w-]+(?:=["']?[\w-]+["']?)?\]`;

const SELECTOR_PART = new RegExp(`^(?::root|html)?(?:${SELECTOR_TEXT})$`, "u");

const VARIANT_SELECTOR = new RegExp(`(?<selector>${SELECTOR_TEXT})`, "u");

const SelectorSchema = Schema.String.check(Schema.isPattern(SELECTOR_PART));

const DarkModeSchema = Schema.Struct({
  selector: Schema.NullOr(SelectorSchema),
  trigger: Schema.Literals(["class", "media"]),
});

const TokenFileDarkModeSchema = Schema.Struct({
  $extensions: Schema.Struct({ [DARK_MODE_EXTENSION]: DarkModeSchema }),
});

const parseTokenFileDarkMode = toParser(TokenFileDarkModeSchema, "ignore");

const toVariantSelector = (masked: string): string | null => {
  const variant = DARK_VARIANT.exec(masked)?.groups?.variant ?? "";

  return VARIANT_SELECTOR.exec(variant)?.groups?.selector ?? null;
};

const toBlockSelector = (sheet: CssTokenSheet): string | null => {
  for (const block of sheet.blocks) {
    const parts = block.prelude.split(",").map((part) => part.trim());
    const selector = parts.find((part) => SELECTOR_PART.test(part)) ?? null;

    if (block.scope === "dark" && selector !== null) {
      return selector;
    }
  }

  return null;
};

const toDarkModeOf = (
  source: string,
  sheet: CssTokenSheet
): PackDarkMode | null => {
  const masked = maskComments(source);

  if (DARK_MEDIA.test(masked)) {
    return { selector: toBlockSelector(sheet), trigger: "media" };
  }

  const selector = toVariantSelector(masked) ?? toBlockSelector(sheet);

  if (selector === null) {
    return null;
  }

  return { selector, trigger: "class" };
};

const fromTokenFileDarkMode = (file: TokenFile): PackDarkMode | null => {
  const parsed = parseTokenFileDarkMode(file);

  if (!parsed.isValid) {
    return null;
  }

  return parsed.value.$extensions[DARK_MODE_EXTENSION];
};

const toDarkModeField = (file: TokenFile): DarkModeField => {
  const darkMode = fromTokenFileDarkMode(file);

  if (darkMode === null) {
    return {};
  }

  return { darkMode };
};

const toDarkSelector = (
  base: string,
  darkMode: PackDarkMode | null
): string => {
  const selector = darkMode?.selector ?? null;

  if (selector === null || base.split(/,\s*/u).includes(selector)) {
    return base;
  }

  return `${base},\n${selector}`;
};

const toHarvestDarkMode = (
  harvests: readonly { readonly darkMode?: PackDarkMode | null }[]
): PackDarkMode | null =>
  harvests.find((harvest) => harvest.darkMode)?.darkMode ?? null;

export {
  DARK_MODE_EXTENSION,
  DarkModeSchema,
  fromTokenFileDarkMode,
  toDarkModeField,
  toDarkModeOf,
  toDarkSelector,
  toHarvestDarkMode,
};

export type { PackDarkMode as DarkMode };
