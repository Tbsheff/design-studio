import { lazy } from "react";

const PatternPanel = lazy(async () => {
  const loaded = await import("./pattern-panel.js");

  return { default: loaded.PatternPanel };
});

const PatternSlot = lazy(async () => {
  const loaded = await import("./pattern-save-dialog.js");

  return { default: loaded.PatternSaveDialog };
});

export { useInsertTab } from "./use-insert-tab.js";

export { usePatternHost } from "./use-pattern-host.js";

export { PatternPanel, PatternSlot };

export type { InsertTab } from "./pattern-model.js";

export type { PatternPanelProps } from "./pattern-panel.js";

export type {
  PatternHost,
  PatternHostOptions,
  PatternMenuItem,
} from "./use-pattern-host.js";

export type { PatternDialogProps as PatternSlotProps } from "./pattern-save-dialog.js";
