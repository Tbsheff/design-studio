import type { PreviewMenuItem } from "./preview-menu-model.js";

interface PreviewMenuParts {
  readonly core: readonly PreviewMenuItem[];
  readonly more: readonly PreviewMenuItem[];
}

const CORE_ORDER: readonly string[] = [
  "parent",
  "child",
  "select-layer",
  "structure-copy",
  "structure-cut",
  "structure-paste",
  "copy-style",
  "paste-style",
  "structure-duplicate",
  "structure-delete",
  "structure-group",
  "structure-wrap",
  "structure-unwrap",
  "bring-forward",
  "send-backward",
  "bring-to-front",
  "send-to-back",
  "zoom",
  "layers",
  "create-component",
];

const DIVIDER_BEFORE: ReadonlySet<string> = new Set([
  "structure-copy",
  "structure-duplicate",
  "bring-forward",
  "zoom",
]);

const toCoreItem = (item: PreviewMenuItem): PreviewMenuItem => ({
  ...item,
  divider: DIVIDER_BEFORE.has(item.id),
});

const toMoreItem = (item: PreviewMenuItem): PreviewMenuItem => ({
  ...item,
  divider: false,
});

const toCoreRank = (item: PreviewMenuItem): number =>
  CORE_ORDER.indexOf(item.id);

const toPreviewMenuParts = (
  items: readonly PreviewMenuItem[]
): PreviewMenuParts => {
  const core: PreviewMenuItem[] = [];
  const more: PreviewMenuItem[] = [];

  const shown = items.filter((item) => !item.hidden);

  for (const item of shown) {
    if (toCoreRank(item) === -1) {
      more.push(toMoreItem(item));
    } else {
      core.push(toCoreItem(item));
    }
  }

  return {
    core: core.toSorted((left, right) => toCoreRank(left) - toCoreRank(right)),
    more,
  };
};

export { toPreviewMenuParts };

export type { PreviewMenuParts };
