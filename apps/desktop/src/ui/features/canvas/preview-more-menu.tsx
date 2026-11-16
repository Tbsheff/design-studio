import { copy } from "./copy.js";
import { toPreviewMenuSplit } from "./preview-menu-core-model.js";
import type { PreviewMenuItem } from "./preview-menu-model.js";
import { PreviewMoreItems } from "./preview-more-items.js";

const toCoreMenuItems = (
  items: readonly PreviewMenuItem[],
  onClose: () => void
): PreviewMenuItem[] => {
  const { core, more } = toPreviewMenuSplit(items);

  if (more.length === 0) {
    return core;
  }

  return [
    ...core,
    {
      divider: core.length > 0,
      icon: "more",
      id: "more",
      label: copy.layerMenuMore,
      run: onClose,
      submenu: (
        <PreviewMoreItems
          items={more}
          label={copy.layerMenuMore}
          onClose={onClose}
        />
      ),
    },
  ];
};

export { toCoreMenuItems };
