import type { LayerPick } from "@design-studio/contracts";

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

export { LAYER_PICK_WAIT_MS, toPickRows };

export type { LayerPickRow, MenuAnchor, MenuLocal };
