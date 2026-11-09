import { copy } from "./copy.js";
import { LayerPickItems } from "./layer-pick-items.js";
import type { PreviewMenuItem } from "./preview-menu-model.js";
import type { LayerPickHandle } from "./use-layer-pick.js";

const toLayerPickItems = (
  pick: LayerPickHandle,
  onClose: () => void
): PreviewMenuItem[] => {
  if (pick.layers.length === 0) {
    return [];
  }

  return [
    {
      icon: "layers",
      id: "select-layer",
      label: copy.selectLayer,
      run: onClose,
      submenu: (
        <LayerPickItems layers={pick.layers} pick={pick} onClose={onClose} />
      ),
    },
  ];
};

export { toLayerPickItems };
