import { lazy } from "react";

const CompareView = lazy(async () => {
  const loaded = await import("./compare-view.js");

  return { default: loaded.CompareView };
});

const LayersPanel = lazy(async () => {
  const loaded = await import("./layers-panel.js");

  return { default: loaded.LayersPanel };
});

const TokensPanel = lazy(async () => {
  const loaded = await import("./tokens-panel.js");

  return { default: loaded.TokensPanel };
});

const VersionsPanel = lazy(async () => {
  const loaded = await import("./versions-panel.js");

  return { default: loaded.VersionsPanel };
});

export { CompareView, LayersPanel, TokensPanel, VersionsPanel };

export { TokenControl } from "./token-control.js";
