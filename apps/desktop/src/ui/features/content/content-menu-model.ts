import type { SelectionContext } from "./deps.js";

const MENU_TEXT = {
  label: "Fill with sample content…",
  needSource: "This layer has no source location",
  wait: "Wait for the last edit to finish",
} as const;

const toMenuBlocker = (
  busy: boolean,
  target: SelectionContext
): string | null => {
  if (!target.source) {
    return MENU_TEXT.needSource;
  }

  if (busy) {
    return MENU_TEXT.wait;
  }

  return null;
};

export { MENU_TEXT, toMenuBlocker };
