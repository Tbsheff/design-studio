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
  {
    group: "Selection",
    id: "text-bold",
    keys: ["Mod+B"],
    label:
      "Bold text: 700, or 400 when every layer is bold. In a text edit, bold the selected range",
  },
  {
    group: "Selection",
    id: "text-underline",
    keys: ["Mod+U"],
    label: "Underline text, or the selected range in a text edit",
  },
  {
    group: "Selection",
    id: "text-strike",
    keys: ["Mod+Shift+X"],
    label: "Strikethrough text, or the selected range in a text edit",
  },
  {
    group: "Selection",
    id: "text-align-left",
    keys: ["Mod+Alt+L"],
    label: "Align text left",
  },
  {
    group: "Selection",
    id: "text-align-center",
    keys: ["Mod+Alt+T"],
    label:
      "Align text center (Mac only: on Windows and Linux, Ctrl+Alt+T is Tidy up)",
  },
  {
    group: "Selection",
    id: "text-align-right",
    keys: ["Mod+Alt+R"],
    label: "Align text right",
  },
  {
    group: "Selection",
    id: "text-align-justify",
    keys: ["Mod+Alt+J"],
    label: "Justify text",
  },
] as const satisfies readonly KeyBinding[];

export { EDIT_KEYS };
