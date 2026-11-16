import { lazy } from "react";

const ChartPanel = lazy(async () => {
  const loaded = await import("./chart-panel.js");

  return { default: loaded.ChartPanel };
});

export { useChartTab } from "./use-chart-tab.js";

export { ChartPanel };

export type { ChartTabState } from "./use-chart-tab.js";
