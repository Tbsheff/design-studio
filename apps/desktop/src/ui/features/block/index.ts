import { lazy } from "react";

const BlockPanel = lazy(async () => {
  const loaded = await import("./block-panel.js");

  return { default: loaded.BlockPanel };
});

const BlockTabBar = lazy(async () => {
  const loaded = await import("./block-tab-bar.js");

  return { default: loaded.BlockTabBar };
});

export { useBlockTab } from "./use-block-tab.js";

export { BlockPanel, BlockTabBar };

export type { BlockTabState } from "./use-block-tab.js";
