import type { LayerPick } from "@design-studio/contracts";

import type { PreviewMenuItem } from "./preview-menu-model.js";

interface MenuLocal {
  readonly x: number;
  readonly y: number;
}

interface MenuAnchor {
  readonly local: MenuLocal;
  readonly x: number;
  readonly y: number;
}

interface LayerPickRow {
  readonly detail: string;
  readonly id: string;
  readonly label: string;
  readonly layer: LayerPick;
}

const LAYER_PICK_WAIT_MS = 1500;

const toPickRows = (layers: LayerPick[]): LayerPickRow[] =>
  layers.map((layer) => ({
    detail: `<${layer.tag}>`,
    id: `layer-${layer.id}`,
    label: layer.name,
    layer,
  }));

const toAfterSelectChild = (
  items: PreviewMenuItem[],
  extra: PreviewMenuItem[]
): PreviewMenuItem[] =>
  items.flatMap((item) => {
    if (item.id === "child") {
      return [item, ...extra];
    }

    return [item];
  });

export { LAYER_PICK_WAIT_MS, toAfterSelectChild, toPickRows };

export type { LayerPickRow, MenuAnchor, MenuLocal };
