import { lazy } from "react";

const BlockPanel = lazy(async () => {
  const loaded = await import("./block-panel.js");

  return { default: loaded.BlockPanel };
});

export { BlockPanel };
