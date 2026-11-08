import { lazy } from "react";

const LayerStylePanel = lazy(async () => {
  const loaded = await import("./layer-style-panel.js");

  return { default: loaded.LayerStylePanel };
});

export { LayerStylePanel };
