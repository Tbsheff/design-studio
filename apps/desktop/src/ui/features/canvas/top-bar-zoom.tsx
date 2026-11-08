import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { shortcutLabel } from "../../../shared/keymap.js";
import { IS_MAC, tipWithKey } from "../../canvas-toolbar-slots.js";
import { useLive } from "../../platform/live-store.js";
import type { LiveStore } from "../../platform/live-store.js";
import type { ZoomSetting } from "../../platform/storage.js";
import { copy } from "./copy.js";
import { DropMenu } from "./top-bar-drop-menu.js";
import type { MenuEntry, MenuGroup } from "./top-bar-menu.js";
import {
  VECTOR_TOOLS,
  useVectorTool,
  vectorTool,
} from "./vector-tool-model.js";

const ZOOMS = [0.5, 0.75, 1, 1.25, 2];

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
        label: `${Math.round(zoomValueValue * 100)}%`,
        run: () => onZoomTo(zoomValueValue),
      })),
    ],
  },
];

const ZoomPill = (zoomProps: ZoomProps): ReactElement => {
  const percent = useLive(zoomProps.zoom);

  return (
    <DropMenu
      label={`Zoom ${percent}%`}
      className="topbar-zoom"
      anchorClass="topbar-fold-narrow"
      groups={() => zoomGroups(zoomProps)}
      align="end"
      tip={tipWithKey(`Zoom ${percent}%`, "zoom-fit")}
    >
      <span className="topbar-zoom-value">
        {percent}
        {copy.text2}
      </span>
      <Icon name="search" size={14} className="topbar-zoom-icon" />
    </DropMenu>
  );
};

interface OverflowProps {
  zoom: ZoomProps;
  present: MenuEntry[];
  viewOpen: boolean;
  onToggleView: () => void;
  onReload: () => void;
  tweak: { open: boolean; disabled: boolean; run: () => void };
}

const OverflowMenu = (overflowProps: OverflowProps): ReactElement => {
  const percent = useLive(overflowProps.zoom.zoom);
  const shape = useVectorTool();
  const zoom = zoomGroups(overflowProps.zoom);

  const groups = (): MenuGroup[] => [
    {
      fold: "wide",
      items: [
        {
          icon: "reload",
          id: "reload",
          label: "Reload preview",
          run: overflowProps.onReload,
        },
        {
          checked: overflowProps.viewOpen,
          icon: "eye",
          id: "view",
          label: "Size, source and checks",
          run: overflowProps.onToggleView,
        },
      ],
    },
    { fold: "wide", items: overflowProps.present, label: "Present" },
    {
      fold: "narrow",
      items: [
        {
          checked: overflowProps.tweak.open,
          disabled: overflowProps.tweak.disabled,
          icon: "sliders",
          id: "tweak",
          label: "Describe a tweak",
          run: overflowProps.tweak.run,
        },
      ],
    },
    {
      fold: "narrow",
      items: zoom
        .flatMap((menuGroup) => menuGroup.items)
        .filter(
          (item) => item.id === "fit" || item.id === "in" || item.id === "out"
        ),
      label: `Zoom ${percent}%`,
    },
    {
      fold: "tight",
      items: VECTOR_TOOLS.map((item) => ({
        checked: shape.available && shape.tool === item.id,
        disabled: !shape.available,
        id: item.id,
        label: item.label,
        meta: item.keyLabel,
        run: () => vectorTool.toggle(item.id),
      })),
      label: "Shapes",
    },
  ];

  return (
    <DropMenu
      label="More actions"
      className="icon-btn topbar-icon topbar-overflow"
      anchorClass="topbar-overflow-anchor"
      groups={groups}
      align="end"
      tip="More actions"
    >
      <Icon name="more" size={14} />
    </DropMenu>
  );
};

export { OverflowMenu, ZoomPill };

export type { ZoomProps };
