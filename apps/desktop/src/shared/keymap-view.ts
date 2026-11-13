import type { KeyBinding } from "./keymap.js";

const VIEW_KEYS = [
  {
    group: "Canvas",
    hold: true,
    id: "pan",
    keys: ["Space"],
    label: "Pan",
  },
  {
    group: "Canvas",
    hold: true,
    id: "zoom-click",
    keys: ["Z"],
    label: "Zoom where you click",
  },
  {
    group: "Canvas",
    id: "zoom-in",
    keys: ["=", "Mod+="],
    label: "Zoom in",
  },
  {
    group: "Canvas",
    id: "zoom-out",
    keys: ["-", "Mod+-"],
    label: "Zoom out",
  },
  {
    group: "Canvas",
    id: "zoom-actual",
    keys: ["Shift+0", "Mod+0"],
    label: "Zoom to 100%",
  },
  {
    group: "Canvas",
    id: "zoom-fit",
    keys: ["Shift+1", "Mod+1"],
    label: "Zoom to fit",
  },
  {
    group: "Canvas",
    id: "zoom-selection",
    keys: ["Shift+2", "Mod+2"],
    label: "Zoom to selection",
  },
  {
    group: "Canvas",
    hold: true,
    id: "measure",
    keys: ["Alt"],
    label: "Measure distance",
  },
  {
    group: "Canvas",
    id: "view-outline",
    keys: ["Shift+O"],
    label: "Show or hide layer outlines",
  },
  {
    group: "Canvas",
    id: "view-layout-grid",
    keys: ["Ctrl+G"],
    label: "Show layout grids",
  },
  {
    group: "Canvas",
    id: "rulers",
    keys: ["Shift+R"],
    label: "Show or hide rulers",
  },
  {
    group: "Canvas",
    id: "insert-icon",
    keys: ["I"],
    label: "Insert icon",
  },
] as const satisfies readonly KeyBinding[];

export { VIEW_KEYS };
