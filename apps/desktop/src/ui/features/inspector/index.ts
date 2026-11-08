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

export { applyCommit, createCurrentEditRequest } from "./edit-request-model.js";

export { useSelectionRefresh } from "./use-selection-refresh.js";

export { runMath, toNumberInput } from "./math-input-model.js";

export {
  hasCurrentDependency,
  toBatchEdits,
  toMergedValues,
  toMultiBlockReason,
} from "./mixed-values-model.js";

export { startOptimistic } from "./optimistic-edit-model.js";

export {
  toActiveCell,
  toAlignCell,
  toAxisRole,
  toParentLayout,
  toSizeMode,
  toSizePatch,
} from "./sizing-model.js";

export {
  NEW_SHADOW,
  listTopLevel,
  toBlur,
  toShadows,
  toShadowsText,
  toWithBlur,
} from "./shadows-model.js";

export {
  NO_SOURCE,
  toDropRequest,
  toSelectionTargets,
  toStructureMenuEntries,
} from "./structure-edits-model.js";

export type { LayerDrop, SelectionOp } from "./structure-edits-model.js";

export { applyPasteJsx } from "./use-paste-jsx.js";
