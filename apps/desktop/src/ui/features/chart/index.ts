import { lazy } from "react";

const ChartPanel = lazy(async () => {
  const loaded = await import("./chart-panel.js");

  return { default: loaded.ChartPanel };
});

export { ChartPanel };
