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
