import { lazy } from "react";

import type { CommandLayer as CommandLayerView } from "./command-layer.js";

const loadCommandLayer = async (): Promise<typeof CommandLayerView> => {
  const loaded = await import("./command-layer.js");

  return loaded.CommandLayer;
};

const CommandLayer = lazy(async () => ({ default: await loadCommandLayer() }));

const CommandRules = lazy(async () => {
  const loaded = await import("./command-rules.js");

  return { default: loaded.CommandRules };
});

export { CommandLayer, CommandRules, loadCommandLayer };

export type { CommandLayer as CommandLayerName } from "./registry.js";
