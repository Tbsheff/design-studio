import type { AppKey } from "@design-studio/contracts";

const LAYER_STYLE_KEY_EVENT = "studio:layer-style-key";

type LayerStyleAppKey = Extract<AppKey, "style-copy" | "style-paste">;

interface LayerStyleKeyDetail {
  readonly id: LayerStyleAppKey;
}

export { LAYER_STYLE_KEY_EVENT };

export type { LayerStyleAppKey, LayerStyleKeyDetail };
