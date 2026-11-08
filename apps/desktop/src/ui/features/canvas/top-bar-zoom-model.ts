import { shortcutLabel } from "../../../shared/keymap.js";
import { IS_MAC } from "../../canvas-toolbar-slots.js";
import type { LiveStore } from "../../platform/live-store.js";
import type { ZoomSetting } from "../../platform/storage.js";
import type { MenuGroup } from "./top-bar-menu-model.js";

const ITEM_0_5 = 0.5;

const ITEM_0_75 = 0.75;

const ITEM_1_25 = 1.25;

const ZOOM_VALUE_VALUE_100 = 100;

const ZOOMS = [ITEM_0_5, ITEM_0_75, 1, ITEM_1_25, 2];

interface ZoomProps {
  zoom: LiveStore<number>;
  setting: ZoomSetting;
  onZoomTo: (zoomValue: number) => void;
  onFit: () => void;
  onStep: (delta: 1 | -1) => void;
}

const zoomGroups = ({
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
      ...ZOOMS.map((zoomValueValue) => ({
        checked: setting === zoomValueValue,
        id: String(zoomValueValue),
        label: `${Math.round(zoomValueValue * ZOOM_VALUE_VALUE_100)}%`,
        run: () => onZoomTo(zoomValueValue),
      })),
    ],
  },
];

export { zoomGroups };

export type { ZoomProps };
