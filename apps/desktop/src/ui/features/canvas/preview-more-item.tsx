import { copy } from "./copy.js";
import { toLayerPickItems } from "./layer-pick-menu.js";
import type { PreviewMenuItem } from "./preview-menu-model.js";
import { toPreviewMenuParts } from "./preview-menu-order-model.js";
import { PreviewItemsSubmenu } from "./preview-items-submenu.js";
import type { LayerPickHandle } from "./use-layer-pick.js";

const toMoreItems = (
  more: readonly PreviewMenuItem[],
  onClose: () => void
): PreviewMenuItem[] => {
  if (more.length === 0) {
    return [];
  }

  return [
    {
      divider: true,
      icon: "more",
      id: "more",
      label: copy.layerMenuMore,
      run: onClose,
      submenu: (
        <PreviewItemsSubmenu
          items={more}
          label={copy.layerMenuMore}
          onClose={onClose}
        />
      ),
    },
  ];
};

interface PreviewMenuExtras {
  readonly onClose: () => void;
  readonly pick: LayerPickHandle;
}

const toPreviewMenuItems = (
  items: readonly PreviewMenuItem[],
  extras: PreviewMenuExtras
): PreviewMenuItem[] => {
  const { onClose, pick } = extras;

  const { core, more } = toPreviewMenuParts([
    ...items,
    ...toLayerPickItems(pick, onClose),
  ]);

  return [...core, ...toMoreItems(more, onClose)];
};

export { toPreviewMenuItems };
