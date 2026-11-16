import { lazy } from "react";

const BlockPanel = lazy(async () => {
  const loaded = await import("./block-panel.js");

  return { default: loaded.BlockPanel };
});

export { useBlockTab } from "./use-block-tab.js";

export { BlockPanel };

export type { BlockTabState } from "./use-block-tab.js";
