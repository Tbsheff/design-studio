import type { KeyBinding } from "./keymap.js";

const TOOL_KEYS = [
  {
    group: "Canvas",
    id: "tool-select",
    keys: ["V"],
    label: "Select tool",
  },
  {
    group: "Canvas",
    id: "tool-hand",
    keys: ["H"],
    label: "Hand tool",
  },
  {
    group: "Canvas",
    id: "tool-frame",
    keys: ["F"],
    label: "Frame tool",
  },
  {
    group: "Canvas",
    id: "tool-rect",
    keys: ["R"],
    label: "Shape tool",
  },
  {
    group: "Canvas",
    id: "tool-ellipse",
    keys: ["O"],
    label: "Ellipse",
  },
  {
    group: "Canvas",
    id: "tool-pen",
    keys: ["P"],
    label: "Pen tool",
  },
  {
    group: "Canvas",
    id: "tool-text",
    keys: ["T"],
    label: "Text tool",
  },
  {
    group: "Canvas",
    id: "tool-comment",
    keys: ["C"],
    label: "Comment tool",
  },
  {
    group: "Canvas",
    id: "tool-link",
    keys: ["L"],
    label: "Prototype link tool",
  },
  {
    group: "Canvas",
    id: "tool-draw",
    keys: ["Shift+P"],
    label: "Draw tool",
  },
  {
    group: "Panels",
    id: "layers",
    keys: ["Alt+1"],
    label: "Layers",
  },
  {
    group: "Panels",
    id: "column-pages",
    keys: ["Alt+2"],
    label: "Pages",
  },
  {
    group: "Panels",
    id: "column-assets",
    keys: ["Alt+3"],
    label: "Assets",
  },
  {
    group: "Panels",
    id: "column-versions",
    keys: ["Alt+4"],
    label: "Versions",
  },
  {
    group: "Panels",
    id: "column-components",
    keys: ["Alt+6"],
    label: "Components",
  },
  {
    group: "Panels",
    id: "column-system",
    keys: ["Alt+7"],
    label: "Design system",
  },
  {
    group: "Panels",
    id: "inspector",
    keys: ["Alt+8"],
    label: "Inspector",
  },
  {
    group: "Canvas",
    id: "present",
    keys: ["Mod+Alt+Enter"],
    label: "Present",
  },
] as const satisfies readonly KeyBinding[];

export { TOOL_KEYS };
