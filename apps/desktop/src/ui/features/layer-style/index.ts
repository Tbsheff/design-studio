import { lazy } from "react";

const LayerStyleSlot = lazy(async () => {
  const loaded = await import("./layer-style-slot.js");

  return { default: loaded.LayerStyleSlot };
});

export { useLayerStyleHost } from "./use-layer-style-host.js";

export { LayerStyleSlot };

export type {
  LayerStyleHost,
  LayerStyleHostOptions,
  LayerStyleMenuItem,
} from "./use-layer-style-host.js";
