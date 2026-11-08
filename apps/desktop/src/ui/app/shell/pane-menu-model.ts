import type { IconName } from "@design-studio/ui";
import type { KeyboardEvent } from "react";

import { findElements } from "../../platform/find-element";
import { pick } from "../../platform/pick.js";
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

const toPanelItems = (header: StudioPaneHeaderProps): MenuItem[] => {
  const { onTab } = header;

  const items = [
    toItem("versions", "history", "Versions", () => onTab("versions")),
  ];

  if (header.hasTokens) {
    items.push(toItem("tokens", "token", "Tokens", () => onTab("tokens")));
  }

  if (header.hasComponents) {
    items.push(
      toItem("components", "component", "Components", () => onTab("components"))
    );
  }

  if (header.hasTweaks) {
    items.push(toItem("tweaks", "sliders", "Tweaks", () => onTab("tweaks")));
  }

  items.push(
    toItem("system", "palette", "Design system", () => onTab("system")),
    toItem("design-md", "doc", "Edit DESIGN.md", header.onDesignMd)
  );

  return items;
};

const toProjectItems = (
  header: StudioPaneHeaderProps,
  onStartRename: () => void
): MenuItem[] => [
  toItem("rename", "pencil", "Rename", onStartRename),
  toItem("settings", "settings", "Project settings", header.onSettings),
  toItem("duplicate", "copy", "Duplicate", header.onDuplicate),
  toItem("trash", "trash", "Move to trash", header.onTrash),
];

const toNavItems = (header: StudioPaneHeaderProps): MenuItem[] => [
  toItem("home", "arrowLeft", "All projects", header.onExit),
];

const handleMenuKey = (event: KeyboardEvent<HTMLDivElement>): void => {
  if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
    return;
  }

  const items = findElements(
    event.currentTarget,
    ".ui-menu-item:not(:disabled)"
  );

  const at = items.indexOf(document.activeElement as HTMLButtonElement);
  const step = pick(event.key === "ArrowDown", 1, -1);
  const next = items[(at + step + items.length) % items.length];

  event.preventDefault();
  next?.focus();
};

export { handleMenuKey, toNavItems, toPanelItems, toProjectItems };

export type { MenuItem };
