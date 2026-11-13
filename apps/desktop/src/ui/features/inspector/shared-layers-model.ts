import type { SelectionContext } from "@design-studio/contracts";

interface SharedLayerSource {
  readonly file: string;
  readonly html: string;
  readonly key: string;
  readonly selector: string;
}

interface SharedLayerMatch {
  readonly file: string;
  readonly frameId: string | null;
  readonly isSame: boolean;
  readonly selector: string;
}

interface SharedLayerCounts {
  readonly same: number;
  readonly total: number;
}

const HTML_PAGE = /\.html?$/iu;

const SPACE = /\s+/gu;

const toSharedLayerSource = (
  selection: readonly SelectionContext[]
): SharedLayerSource | null => {
  const [only] = selection;
  const file = only?.source?.file ?? null;

  if (selection.length !== 1 || !only || file === null) {
    return null;
  }

  if (!HTML_PAGE.test(file)) {
    return null;
  }

  return {
    file,
    html: only.outerHTML.replaceAll(SPACE, " ").trim(),
    key: `${file}|${only.selector}`,
    selector: only.selector,
  };
};

const toSameMatches = (
  items: readonly SharedLayerMatch[]
): readonly SharedLayerMatch[] => items.filter((item) => item.isSame);

const toSharedLayerCounts = (
  items: readonly SharedLayerMatch[]
): SharedLayerCounts => ({
  same: toSameMatches(items).length + 1,
  total: items.length + 1,
});

const toSharedLayerFiles = (items: readonly SharedLayerMatch[]): string =>
  items.map((item) => item.file).join(", ");

const isSharedLayerShown = (items: readonly SharedLayerMatch[]): boolean =>
  items.length > 0;

const isSharedLayerApplicable = (
  items: readonly SharedLayerMatch[],
  isEdited: boolean
): boolean => isEdited && toSameMatches(items).length > 0;

export {
  isSharedLayerApplicable,
  isSharedLayerShown,
  toSameMatches,
  toSharedLayerCounts,
  toSharedLayerFiles,
  toSharedLayerSource,
};

export type { SharedLayerCounts, SharedLayerMatch, SharedLayerSource };
