import { lazy } from "react";
import type { LazyExoticComponent } from "react";

import type { CodeEditDialog as CodeEditDialogView } from "./code-edit-dialog.js";
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

const CodeEditDialog: LazyExoticComponent<typeof CodeEditDialogView> = lazy(
  async () => {
    const loaded = await import("./code-edit-dialog.js");

    return { default: loaded.CodeEditDialog };
  }
);

const CodeEditHost = lazy(async () => {
  const loaded = await import("./code-edit-host.js");

  return { default: loaded.CodeEditHost };
});

export { CodeEditDialog, CodeEditHost, Inspector, TweaksPanel };

export { codeEditStore } from "./use-code-edit-target.js";

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

export { applyCommit } from "./edit-request-model.js";

export { createCurrentEditRequest } from "./use-current-edit-request.js";

export { useSelectionRefresh } from "./use-selection-refresh.js";

export { runMath, toNumberInput } from "./math-input-model.js";

export {
  hasCurrentDependency,
  toBatchEdits,
  toMergedValues,
  toMultiBlockReason,
} from "./mixed-values-model.js";

export {
  isHistoryStep,
  toRefreshedSelection,
  toStepToast,
} from "./use-edit-history.js";

export { SwapQueue } from "./use-swap-gate.js";

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

export { getAuthoredCss } from "./use-authored-css.js";

export { propsApi } from "./use-props-api.js";

export type { VariantPreviewQuery } from "./use-props-api.js";
