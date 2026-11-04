import { lazy } from "react";

import { ContentPanel as ContentPanelView } from "./features/content/index.js";
import { FillSlot as FillSlotView } from "./features/fill/index.js";
import { MotionSlot as MotionSlotView } from "./features/motion/index.js";
import { StateStylesSlot as StateStylesSlotView } from "./features/state-styles/index.js";
import { TextStyleSlot as TextStyleSlotView } from "./features/text-styles/index.js";

const AccessibilitySlot = lazy(async () => {
  const loaded = await import("./features/accessibility/index.js");

  return { default: loaded.AccessibilitySlot };
});

const StackingSlot = lazy(async () => {
  const loaded = await import("./features/stacking/index.js");

  return { default: loaded.StackingSlot };
});

const VariantSheet = lazy(async () => {
  const loaded = await import("./features/component-variant/index.js");

  return { default: loaded.VariantSheet };
});

const ContentPanel = ContentPanelView;
const FillSlot = FillSlotView;
const MotionSlot = MotionSlotView;
const StateStylesSlot = StateStylesSlotView;
const TextStyleSlot = TextStyleSlotView;

export {
  AccessibilitySlot,
  ContentPanel,
  FillSlot,
  MotionSlot,
  StackingSlot,
  StateStylesSlot,
  TextStyleSlot,
  VariantSheet,
};

export {
  collectCommands,
  commandBlocker,
  runCommand,
} from "./features/commands/registry.js";
export { IS_MAC } from "./features/commands/keys.js";
