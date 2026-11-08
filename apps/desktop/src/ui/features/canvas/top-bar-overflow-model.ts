import type { MenuEntry, MenuGroup } from "./top-bar-menu-model.js";
import { zoomGroups } from "./top-bar-zoom-model.js";
import type { ZoomProps } from "./top-bar-zoom-model.js";
import { VECTOR_TOOLS, vectorTool } from "./vector-tool-model.js";
import type { useVectorTool } from "./vector-tool-model.js";

interface OverflowProps {
  zoom: ZoomProps;
  present: MenuEntry[];
  viewOpen: boolean;
  onToggleView: () => void;
  onReload: () => void;
  askChat: { run: () => void };
}

type ActiveTool = ReturnType<typeof useVectorTool>;

const ZOOM_SHORT_IDS = new Set(["fit", "in", "out"]);

const toZoomEntries = (zoom: ZoomProps): MenuEntry[] => {
  const entries: MenuEntry[] = [];

  for (const menuGroup of zoomGroups(zoom)) {
    for (const item of menuGroup.items) {
      if (ZOOM_SHORT_IDS.has(item.id)) {
        entries.push(item);
      }
    }
  }

  return entries;
};

const toViewGroup = (props: OverflowProps): MenuGroup => ({
  fold: "wide",
  items: [
    {
      icon: "reload",
      id: "reload",
      label: "Reload preview",
      run: props.onReload,
    },
    {
      checked: props.viewOpen,
      icon: "eye",
      id: "view",
      label: "Size, source and checks",
      run: props.onToggleView,
    },
  ],
});

const toAskChatGroup = (props: OverflowProps): MenuGroup => ({
  fold: "narrow",
  items: [
    {
      icon: "sliders",
      id: "ask-chat",
      label: "Ask the chat",
      run: props.askChat.run,
    },
  ],
});

const toVectorToolGroup = (activeTool: ActiveTool): MenuGroup => ({
  fold: "tight",
  items: VECTOR_TOOLS.map((item) => ({
    checked: activeTool.available && activeTool.tool === item.id,
    disabled: !activeTool.available,
    id: item.id,
    label: item.label,
    meta: item.keyLabel,
    run: () => vectorTool.toggle(item.id),
  })),
  label: "Shapes",
});

const toOverflowGroups = (
  props: OverflowProps,
  percent: number,
  activeTool: ActiveTool
): MenuGroup[] => [
  toViewGroup(props),
  { fold: "wide", items: props.present, label: "Present" },
  toAskChatGroup(props),
  {
    fold: "narrow",
    items: toZoomEntries(props.zoom),
    label: `Zoom ${percent}%`,
  },
  toVectorToolGroup(activeTool),
];

export { toOverflowGroups };

export type { OverflowProps };
