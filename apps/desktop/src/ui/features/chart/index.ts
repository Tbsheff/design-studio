import { lazy } from "react";

const ChartPanel = lazy(async () => {
  const loaded = await import("./chart-panel.js");

  return { default: loaded.ChartPanel };
});

const ChartTabBar = lazy(async () => {
  const loaded = await import("./chart-tab-bar.js");

  return { default: loaded.ChartTabBar };
});

export { useChartTab } from "./use-chart-tab.js";

export { ChartPanel, ChartTabBar };

export type { ChartTabState } from "./use-chart-tab.js";
