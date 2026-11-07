import { Suspense, createElement, lazy } from "react";
import type { ReactElement } from "react";

import type { EffectPanelProps } from "./effect-panel.js";

const LazyPanel = lazy(async () => {
  const loaded = await import("./effect-panel.js");

  return { default: loaded.EffectPanel };
});

const effectSlot = (props: EffectPanelProps): ReactElement =>
  createElement(Suspense, { fallback: null }, createElement(LazyPanel, props));

export { effectSlot as EffectSlot };
