import { lazy } from "react";
import type { LazyExoticComponent } from "react";

import type { TweaksPanel as TweaksPanelView } from "./tweaks-panel.js";

const Inspector = lazy(async () => {
  const loaded = await import("./inspector.js");

  return { default: loaded.Inspector };
});

const TweaksPanel: LazyExoticComponent<typeof TweaksPanelView> = lazy(
  async () => {
    const loaded = await import("./tweaks-panel.js");

    return { default: loaded.TweaksPanel };
  }
);

export { Inspector, TweaksPanel };

export { useEditVariant } from "./edit-variant.js";

export { inspectorEmptyReason, isDirectEditable } from "./inspector-model.js";

export { canPolishRun, POLISH_REQUEST } from "./polish-model.js";
