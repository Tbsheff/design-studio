import type { PhotoArtColors } from "./engine/index.js";
import {
  isDarkSelector,
  toArtSources,
  toColorsOf,
  toLightVariables,
  toVariables,
} from "./photo-art-colors.js";
import type { CssBlock } from "./photo-art-colors.js";
import type { PhotoPage } from "./photo-pick.js";

interface DarkForms {
  readonly isClass: boolean;
  readonly isMedia: boolean;
}

interface ArtPalette {
  readonly dark: PhotoArtColors | null;
  readonly forms: DarkForms;
  readonly light: PhotoArtColors;
}

const isDarkMediaRoot = (block: CssBlock): boolean =>
  block.isDarkMedia && block.selector.includes(":root");

const isDarkClass = (block: CssBlock): boolean =>
  !block.isDarkMedia && isDarkSelector(block.selector);

const isDarkBlock = (block: CssBlock): boolean =>
  isDarkMediaRoot(block) || isDarkClass(block);

const hasVariables = (
  sources: readonly string[],
  isPicked: (block: CssBlock) => boolean
): boolean => toVariables(sources, isPicked, new Map()).size > 0;

const isSameColors = (left: PhotoArtColors, right: PhotoArtColors): boolean =>
  left.accent === right.accent &&
  left.ink === right.ink &&
  left.primary === right.primary &&
  left.surface === right.surface;

const toDarkColors = (
  sources: readonly string[],
  light: PhotoArtColors,
  base: ReadonlyMap<string, string>
): PhotoArtColors | null => {
  const dark = toColorsOf(toVariables(sources, isDarkBlock, base));

  if (isSameColors(dark, light)) {
    return null;
  }

  return dark;
};

const toArtPalette = async (
  workTree: string,
  page: PhotoPage
): Promise<ArtPalette> => {
  const sources = await toArtSources(workTree, page);
  const base = toLightVariables(sources);
  const light = toColorsOf(base);

  const forms: DarkForms = {
    isClass: hasVariables(sources, isDarkClass),
    isMedia: hasVariables(sources, isDarkMediaRoot),
  };

  if (!forms.isClass && !forms.isMedia) {
    return { dark: null, forms, light };
  }

  return { dark: toDarkColors(sources, light, base), forms, light };
};

export { toArtPalette };

export type { ArtPalette, DarkForms };
