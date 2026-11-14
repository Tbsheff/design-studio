import type { KeyBinding } from "./keymap.js";

const EDIT_KEYS = [
  {
    group: "Selection",
    id: "layer-resize",
    keys: ["Mod+→", "Mod+←", "Mod+↓", "Mod+↑"],
    label: "Resize by 1 px: → ← width, ↓ ↑ height (Shift: 10 px)",
  },
  {
    group: "Selection",
    id: "select-siblings",
    keys: ["Mod+A"],
    label: "Select the layer and its siblings, or all frames",
  },
  {
    group: "Selection",
    id: "opacity-keys",
    keys: ["0-9"],
    label: "Opacity: 1 is 10%, 0 is 100%, 2 digits fast for an exact value",
  },
  {
    group: "Selection",
    id: "font-size-up",
    keys: ["Mod+Shift+."],
    label: "Font size up",
  },
  {
    group: "Selection",
    id: "font-size-down",
    keys: ["Mod+Shift+,"],
    label: "Font size down",
  },
  {
    group: "Selection",
    id: "letter-spacing-up",
    keys: ["Alt+."],
    label: "Letter spacing up",
  },
  {
    group: "Selection",
    id: "letter-spacing-down",
    keys: ["Alt+,"],
    label: "Letter spacing down",
  },
  {
    group: "Selection",
    id: "line-height-up",
    keys: ["Alt+Shift+."],
    label: "Line height up",
  },
  {
    group: "Selection",
    id: "line-height-down",
    keys: ["Alt+Shift+,"],
    label: "Line height down",
  },
] as const satisfies readonly KeyBinding[];

export { EDIT_KEYS };
