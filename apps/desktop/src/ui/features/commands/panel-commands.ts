import type { ColumnTab, KeyId } from "./deps.js";
import type { Command } from "./registry.js";
import type { StudioActions } from "./studio-actions.js";

interface ColumnSpec {
  readonly icon: Command["icon"];
  readonly keyId: KeyId;
  readonly tab: ColumnTab;
  readonly title: string;
}

const COLUMNS: readonly ColumnSpec[] = [
  { icon: "layers", keyId: "layers", tab: "layers", title: "Layers" },
  { icon: "doc", keyId: "column-pages", tab: "pages", title: "Pages" },
  {
    icon: "assets",
    keyId: "column-assets",
    tab: "assets",
    title: "Assets and tokens",
  },
  {
    icon: "history",
    keyId: "column-versions",
    tab: "versions",
    title: "Versions",
  },
  {
    icon: "component",
    keyId: "column-components",
    tab: "components",
    title: "Components",
  },
  {
    icon: "palette",
    keyId: "column-system",
    tab: "system",
    title: "Design system",
  },
];

const columnCommands = (studioActions: StudioActions): Command[] =>
  COLUMNS.map((spec) => ({
    group: "Panels",
    icon: spec.icon,
    id: `panel.${spec.tab}`,
    keyId: spec.keyId,
    keywords: "column tab side panel show hide toggle",
    run: () => studioActions.onColumn(spec.tab),
    title: `Show or hide ${spec.title}`,
  }));

const panelCommands = (studioActions: StudioActions): Command[] => [
  ...columnCommands(studioActions),
  {
    group: "Panels",
    icon: "sliders",
    id: "panel.inspector",
    keyId: "inspector",
    keywords: "design prototype code properties right",
    run: studioActions.onInspector,
    title: "Show or hide the Inspector",
  },
  {
    group: "Panels",
    icon: "comment",
    id: "panel.comments",
    keywords: "pins feedback notes right",
    run: () => studioActions.onPanel("comments"),
    title: "Show Comments",
  },
];

export { panelCommands };
