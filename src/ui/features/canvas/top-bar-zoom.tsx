import { shortcutLabel } from "../../../shared/keymap.js";
import { IS_MAC, tipWithKey } from "../../canvas-toolbar-slots.js";
import { Icon } from "../../kit/Icon.js";
import { useLive, type LiveStore } from "../../platform/live-store.js";
import type { ZoomSetting } from "../../platform/storage.js";
import { DropMenu } from "./top-bar-drop-menu.js";
import type { MenuEntry, MenuGroup } from "./top-bar-menu.js";
import {
  VECTOR_TOOLS,
  useVectorTool,
  vectorTool,
} from "./vector-tool-model.js";

const ZOOMS = [0.5, 0.75, 1, 1.25, 2];

export interface ZoomProps {
  zoom: LiveStore<number>;
  setting: ZoomSetting;
  onZoomTo: (z: number) => void;
  onFit: () => void;
  onStep: (d: 1 | -1) => void;
}

function zoomGroups({
  setting,
  onZoomTo,
  onFit,
  onStep,
}: Omit<ZoomProps, "zoom">): MenuGroup[] {
  return [
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
          id: "fit",
          label: "Zoom to fit",
          meta: shortcutLabel("zoom-fit", IS_MAC),
          checked: setting === "fit",
          run: onFit,
        },
        ...ZOOMS.map((z) => ({
          id: String(z),
          label: `${Math.round(z * 100)}%`,
          checked: setting === z,
          run: () => onZoomTo(z),
        })),
      ],
    },
  ];
}

export function ZoomPill(p: ZoomProps) {
  const percent = useLive(p.zoom);

  return (
    <DropMenu
      label={`Zoom ${percent}%`}
      className="topbar-zoom"
      anchorClass="topbar-fold-narrow"
      groups={() => zoomGroups(p)}
      align="end"
      tip={tipWithKey(`Zoom ${percent}%`, "zoom-fit")}
    >
      <span className="topbar-zoom-value">{percent}%</span>
      <Icon name="search" size={14} className="topbar-zoom-icon" />
    </DropMenu>
  );
}

interface OverflowProps {
  zoom: ZoomProps;
  present: MenuEntry[];
  viewOpen: boolean;
  onToggleView: () => void;
  onReload: () => void;
  tweak: { open: boolean; disabled: boolean; run: () => void };
}

export function OverflowMenu(p: OverflowProps) {
  const percent = useLive(p.zoom.zoom);
  const shape = useVectorTool();
  const zoom = zoomGroups(p.zoom);

  const groups = (): MenuGroup[] => [
    {
      fold: "wide",
      items: [
        {
          id: "reload",
          label: "Reload preview",
          icon: "reload",
          run: p.onReload,
        },
        {
          id: "view",
          label: "Size, source and checks",
          icon: "eye",
          checked: p.viewOpen,
          run: p.onToggleView,
        },
      ],
    },
    { fold: "wide", label: "Present", items: p.present },
    {
      fold: "narrow",
      items: [
        {
          id: "tweak",
          label: "Describe a tweak",
          icon: "sliders",
          checked: p.tweak.open,
          disabled: p.tweak.disabled,
          run: p.tweak.run,
        },
      ],
    },
    {
      fold: "narrow",
      label: `Zoom ${percent}%`,
      items: zoom
        .flatMap((g) => g.items)
        .filter(
          (item) => item.id === "fit" || item.id === "in" || item.id === "out"
        ),
    },
    {
      fold: "tight",
      label: "Shapes",
      items: VECTOR_TOOLS.map((item) => ({
        id: item.id,
        label: item.label,
        meta: item.keyLabel,
        checked: shape.available && shape.tool === item.id,
        disabled: !shape.available,
        run: () => vectorTool.toggle(item.id),
      })),
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
}
