import { lazy } from "react";

const Inspector = lazy(async () => {
  const loaded = await import("./inspector.js");

  return { default: loaded.Inspector };
});

const TweaksPanel = lazy(async () => {
  const loaded = await import("./tweaks-panel.js");

  return { default: loaded.TweaksPanel };
});

export { Inspector, TweaksPanel };

export { inspectorEmptyReason, isDirectEditable } from "./inspector-model.js";

export { canPolishRun, POLISH_REQUEST } from "./polish-model.js";
