import type { Icon } from "@design-studio/ui";
import type { CSSProperties } from "react";

import { copy } from "./copy.js";
import type { CardAction, MenuAt } from "./project-card-model.js";

interface MenuEntry {
  readonly action: CardAction;
  readonly label: string;
  readonly icon: Parameters<typeof Icon>[0]["name"];
  readonly keys: string;
  readonly isDanger: boolean;
}

interface MenuEntries {
  readonly safe: readonly MenuEntry[];
  readonly danger: readonly MenuEntry[];
}

const EMPTY_STYLE: CSSProperties = {};

const toMenuStyle = (at: Exclude<MenuAt, null>): CSSProperties => {
  if (at === "button" || at === "keys") {
    return EMPTY_STYLE;
  }

  return { left: at.x, right: "auto", top: at.y };
};

const toMenuMode = (at: Exclude<MenuAt, null>): string => {
  if (at === "keys") {
    return " instant";
  }

  if (at === "button") {
    return "";
  }

  return " at-pointer";
};

const toDeleteLabel = (place: string | null): string => {
  if (place) {
    return copy.menuRemoveFromStudio;
  }

  return copy.menuMoveToTrash;
};

const toRenamedName = (value: string, current: string): string | null => {
  const trimmed = value.trim();

  if (trimmed && trimmed !== current) {
    return trimmed;
  }

  return null;
};

const toNextMenuIndex = (
  key: string,
  index: number,
  count: number
): number | null => {
  if (key === "ArrowDown") {
    return index + 1;
  }

  if (key === "ArrowUp") {
    return index - 1;
  }

  if (key === "Home") {
    return 0;
  }

  if (key === "End") {
    return count - 1;
  }

  return null;
};

const toMenuEntries = (place: string | null): MenuEntries => {
  const entries: MenuEntry[] = [
    {
      action: "open",
      icon: "chevronRight",
      isDanger: false,
      keys: "↩",
      label: copy.menuOpen,
    },
    {
      action: "rename",
      icon: "pencil",
      isDanger: false,
      keys: "F2",
      label: copy.menuRename,
    },
    {
      action: "duplicate",
      icon: "copy",
      isDanger: false,
      keys: "⌘D",
      label: copy.menuDuplicate,
    },
  ];

  if (place) {
    entries.push({
      action: "reveal",
      icon: "folder",
      isDanger: false,
      keys: "",
      label: copy.menuRevealInFinder,
    });
  }

  const danger: MenuEntry[] = [
    {
      action: "delete",
      icon: "trash",
      isDanger: true,
      keys: "⌘⌫",
      label: toDeleteLabel(place),
    },
  ];

  return { danger, safe: entries };
};

export {
  toMenuEntries,
  toMenuMode,
  toMenuStyle,
  toNextMenuIndex,
  toRenamedName,
};

export type { MenuEntries, MenuEntry };
