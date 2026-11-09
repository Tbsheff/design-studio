import { lazy } from "react";

const SpeedPanel = lazy(async () => {
  const loaded = await import("./speed-panel.js");

  return { default: loaded.SpeedPanel };
});

export { SpeedPanel };

export type { SpeedPanelProps } from "./speed-panel.js";
