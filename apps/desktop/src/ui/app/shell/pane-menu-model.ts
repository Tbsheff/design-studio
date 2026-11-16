import type { IconName } from "@design-studio/ui";

import type { StudioPaneHeaderProps } from "./pane-header-types";

interface MenuItem {
  readonly checked: boolean | null;
  readonly icon: IconName;
  readonly id: string;
  readonly label: string;
  readonly meta: string | null;
  readonly run: () => void;
}

const toItem = (
  id: string,
  icon: IconName,
  label: string,
  run: () => void
): MenuItem => {
  const checked = null;
  const meta = null;

  return { checked, icon, id, label, meta, run };
};

const toProjectItems = (
  header: StudioPaneHeaderProps,
  onStartRename: () => void
): MenuItem[] => [
  toItem("rename", "pencil", "Rename", onStartRename),
  toItem("duplicate", "copy", "Duplicate", header.onDuplicate),
  toItem("settings", "settings", "Project settings…", header.onSettings),
  toItem("trash", "trash", "Move to trash", header.onTrash),
];

const toNavItems = (header: StudioPaneHeaderProps): MenuItem[] => [
  toItem("home", "arrowLeft", "All projects", header.onExit),
];

export { toNavItems, toProjectItems };

export type { MenuItem };
