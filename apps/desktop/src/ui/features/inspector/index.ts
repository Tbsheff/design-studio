import { lazy } from "react";
import type { LazyExoticComponent } from "react";

import type { TweaksPanel as TweaksPanelView } from "./tweaks-panel.js";

const Inspector = lazy(async () => {
  await import("../../styles/inspector-edit.css");
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

export {
  editVariantStore,
  setForceState,
  useEditVariant,
} from "./use-edit-variant.js";

export { toInspectorEmptyReason, isDirectEditable } from "./inspector-model.js";

export { canPolishRun, POLISH_REQUEST } from "./polish-model.js";

export { toJoinedCorners } from "./corners-model.js";

export {
  SIDES,
  hasChildElements,
  isValidColor,
  toBoxSides,
  toChangedProps,
  toDisplayColor,
  toHexColor,
  toNormalizedLength,
  toNumberText,
  toParsedNumber,
  toShiftedPart,
  toShiftedValue,
  toSteppedValue,
  toStyleValues,
  toTextEditability,
} from "./css-value-model.js";

export type { Shift, ShiftPart, Side, StyleValues } from "./css-value-model.js";

export {
  INLINE_SOURCE,
  MAX_BYTES,
  MAX_RULES,
  isCoveredDeclaration,
  toAuthoredReply,
  toCollapsedCrumbs,
  toCopyCss,
  toDeclarations,
  toOtherStyles,
  toPathCrumbs,
  toSelectionPath,
} from "./authored-css-model.js";

export type {
  AuthoredCss,
  AuthoredDeclaration,
  Crumb,
  PathCrumb,
} from "./authored-css-model.js";

export { toImageTarget } from "./use-image-api.js";

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
