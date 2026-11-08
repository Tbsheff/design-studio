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

export {
  collapseCrumbs,
  formatCopyCss,
  isCoveredDeclaration,
  otherStyles,
  parseAuthoredReply,
  parseDeclarations,
  parseSelectionPath,
  pathCrumbs,
} from "./authored-css.js";

export {
  changedProps,
  colorToHex,
  displayColor,
  expandBox,
  hasChildElements,
  normalizeLength,
  parseNumber,
  stepValue,
  valuesFromStyles,
} from "./css-values.js";

export { createDeltaBatcher, mergeDeltas } from "./delta-batch.js";

export type { DeltaBatcher } from "./delta-batch.js";

export { evaluateMath, resolveNumberInput } from "./math-input.js";

export {
  batchEdits,
  hasCurrentDependency,
  mergeValues,
  multiBlockReason,
} from "./mixed-values.js";

export {
  isHistoryStep,
  refreshedSelection,
  stepToast,
} from "./use-edit-history.js";

export { SwapQueue } from "./use-swap-gate.js";
