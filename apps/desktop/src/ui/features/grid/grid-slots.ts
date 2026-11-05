import { Suspense, createElement, lazy } from "react";
import type { ReactElement } from "react";

import type { GridOverlayProps } from "./grid-overlay.js";
import type { GridPanelProps } from "./grid-panel.js";

const LazyOverlay = lazy(async () => {
  const loaded = await import("./grid-overlay.js");

  return { default: loaded.GridOverlay };
});

const LazyPanel = lazy(async () => {
  const loaded = await import("./grid-panel.js");

  return { default: loaded.GridPanel };
});

const gridOverlay = (props: GridOverlayProps): ReactElement =>
  createElement(
    Suspense,
    { fallback: null },
    createElement(LazyOverlay, props)
  );

const gridSlot = (props: GridPanelProps): ReactElement =>
  createElement(Suspense, { fallback: null }, createElement(LazyPanel, props));

export { gridOverlay as GridOverlay, gridSlot as GridSlot };
