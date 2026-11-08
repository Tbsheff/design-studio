import { lazy } from "react";

const KitDriftPanel = lazy(async () => {
  const loaded = await import("./kit-drift-panel.js");

  return { default: loaded.KitDriftPanel };
});

export { KitDriftPanel };
