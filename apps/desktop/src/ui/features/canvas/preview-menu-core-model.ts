import type { PreviewMenuItem } from "./preview-menu-model.js";

interface PreviewMenuSplit {
  readonly core: PreviewMenuItem[];
  readonly more: PreviewMenuItem[];
}

const CORE_GROUPS: readonly (readonly string[])[] = [
  ["ask"],
  [
    "structure-copy",
    "structure-paste",
    "structure-duplicate",
    "structure-delete",
  ],
  ["structure-group", "structure-wrap"],
  ["bring-forward", "send-backward", "bring-to-front", "send-to-back"],
  ["copy-style", "paste-style"],
  ["select-layer", "layers"],
];

const CORE_GROUP_OF = new Map(
  CORE_GROUPS.flatMap((ids, group) =>
    ids.map((id): [string, number] => [id, group])
  )
);

const toCoreItems = (items: readonly PreviewMenuItem[]): PreviewMenuItem[] => {
  const byId = new Map(items.map((item) => [item.id, item]));
  const core: PreviewMenuItem[] = [];
  let lastGroup: number | null = null;

  for (const id of CORE_GROUPS.flat()) {
    const item = byId.get(id);
    const group = CORE_GROUP_OF.get(id) ?? null;

    if (item && !item.hidden) {
      core.push({
        ...item,
        divider: lastGroup !== null && lastGroup !== group,
      });
      lastGroup = group;
    }
  }

  return core;
};

const toPreviewMenuSplit = (
  items: readonly PreviewMenuItem[]
): PreviewMenuSplit => {
  const more: PreviewMenuItem[] = [];

  for (const item of items) {
    if (!item.hidden && !CORE_GROUP_OF.has(item.id)) {
      more.push({ ...item, divider: false });
    }
  }

  return { core: toCoreItems(items), more };
};

export { toPreviewMenuSplit };

export type { PreviewMenuSplit };
