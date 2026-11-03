import { lazy } from "react";

const AccessibilitySlot = lazy(async () => {
  const loaded = await import("./features/accessibility/index.js");

  return { default: loaded.AccessibilitySlot };
});

const StackingSlot = lazy(async () => {
  const loaded = await import("./features/stacking/index.js");

  return { default: loaded.StackingSlot };
});

export { AccessibilitySlot, StackingSlot };

export { runCommand } from "./features/commands/registry.js";
export { IS_MAC } from "./features/commands/keys.js";
