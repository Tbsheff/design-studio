import type { MenuEntry, MenuGroup } from "./top-bar-menu.js";
import type { VectorToolId } from "./vector-tool-model.js";
import { VECTOR_TOOLS, vectorTool } from "./vector-tool-model.js";
import { toQuickZoomEntries } from "./zoom-menu-model.js";
import type { ZoomProps } from "./zoom-menu-model.js";

interface VectorState {
  readonly available: boolean;
  readonly tool: VectorToolId | null;
}

interface OverflowGroupsInput {
  readonly zoom: ZoomProps;
  readonly percent: number;
  readonly present: MenuEntry[];
  readonly vectorState: VectorState;
  readonly isViewOpen: boolean;
  readonly onToggleView: () => void;
  readonly onReload: () => void;
  readonly isTweakOpen: boolean;
  readonly isTweakDisabled: boolean;
  readonly onTweak: () => void;
}

const toViewGroup = (input: OverflowGroupsInput): MenuGroup => ({
  fold: "wide",
  items: [
    {
      icon: "reload",
      id: "reload",
      label: "Reload preview",
      run: input.onReload,
    },
    {
      checked: input.isViewOpen,
      icon: "eye",
      id: "view",
      label: "Size, source and checks",
      run: input.onToggleView,
    },
  ],
});

const toTweakGroup = (input: OverflowGroupsInput): MenuGroup => ({
  fold: "narrow",
  items: [
    {
      checked: input.isTweakOpen,
      disabled: input.isTweakDisabled,
      icon: "sliders",
      id: "tweak",
      label: "Describe a tweak",
      run: input.onTweak,
    },
  ],
});

const toVectorGroup = (vectorState: VectorState): MenuGroup => ({
  fold: "tight",
  items: VECTOR_TOOLS.map((tool) => ({
    checked: vectorState.available && vectorState.tool === tool.id,
    disabled: !vectorState.available,
    id: tool.id,
    label: tool.label,
    meta: tool.keyLabel,
    run: () => vectorTool.toggle(tool.id),
  })),
  label: "Shapes",
});

const toOverflowGroups = (input: OverflowGroupsInput): MenuGroup[] => [
  toViewGroup(input),
  { fold: "wide", items: input.present, label: "Present" },
  toTweakGroup(input),
  {
    fold: "narrow",
    items: toQuickZoomEntries(input.zoom),
    label: `Zoom ${input.percent}%`,
  },
  toVectorGroup(input.vectorState),
];

export { toOverflowGroups };

export type { OverflowGroupsInput };
