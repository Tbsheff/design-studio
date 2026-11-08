import { shortcutLabel } from "../../../shared/keymap.js";
import { IS_MAC } from "../../canvas-toolbar-slots.js";
import type { LiveStore } from "../../platform/live-store.js";
import type { ZoomSetting } from "../../platform/storage.js";
import type { MenuEntry, MenuGroup } from "./top-bar-menu.js";

const ZOOM_HALF = 0.5;

const ZOOM_THREE_QUARTERS = 0.75;

const ZOOM_FIVE_QUARTERS = 1.25;

const ZOOM_QUARTER_STEPS = [
  ZOOM_HALF,
  ZOOM_THREE_QUARTERS,
  1,
  ZOOM_FIVE_QUARTERS,
  2,
];

const PERCENT_SCALE = 100;

const QUICK_ZOOM_IDS = new Set(["fit", "in", "out"]);

interface ZoomProps {
  readonly zoom: LiveStore<number>;
  readonly setting: ZoomSetting;
  readonly onZoomTo: (zoomValue: number) => void;
  readonly onFit: () => void;
  readonly onStep: (delta: 1 | -1) => void;
}

const toZoomGroups = ({
  setting,
  onZoomTo,
  onFit,
  onStep,
}: Omit<ZoomProps, "zoom">): MenuGroup[] => [
  {
    items: [
      {
        id: "in",
        label: "Zoom in",
        meta: shortcutLabel("zoom-in", IS_MAC),
        run: () => onStep(1),
      },
      {
        id: "out",
        label: "Zoom out",
        meta: shortcutLabel("zoom-out", IS_MAC),
        run: () => onStep(-1),
      },
    ],
  },
  {
    items: [
      {
        checked: setting === "fit",
        id: "fit",
        label: "Zoom to fit",
        meta: shortcutLabel("zoom-fit", IS_MAC),
        run: onFit,
      },
      ...ZOOM_QUARTER_STEPS.map((zoomValue) => ({
        checked: setting === zoomValue,
        id: String(zoomValue),
        label: `${Math.round(zoomValue * PERCENT_SCALE)}%`,
        run: () => onZoomTo(zoomValue),
      })),
    ],
  },
];

const toQuickZoomEntries = (
  props: Omit<ZoomProps, "zoom">
): MenuEntry[] => {
  const entries: MenuEntry[] = [];

  for (const group of toZoomGroups(props)) {
    for (const entry of group.items) {
      if (QUICK_ZOOM_IDS.has(entry.id)) {
        entries.push(entry);
      }
    }
  }

  return entries;
};

export { toQuickZoomEntries, toZoomGroups };

export type { ZoomProps };
