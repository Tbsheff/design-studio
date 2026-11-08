import type { IconName } from "@design-studio/ui";
import type { KeyboardEvent } from "react";

import { findElements } from "../../platform/find-element";
import { pick } from "../../platform/pick.js";
import type { StudioPaneHeaderProps } from "./pane-header-types";

type ThemePref = "system" | "light" | "dark";

interface ThemeApi {
  get: () => ThemePref;
  set: (pref: ThemePref) => void;
}

interface ThemeHost {
  readonly studioTheme: ThemeApi | null;
}

interface MenuItem {
  readonly checked: boolean | null;
  readonly icon: IconName;
  readonly id: string;
  readonly label: string;
  readonly meta: string | null;
  readonly run: () => void;
}

const THEMES: readonly ThemePref[] = ["system", "light", "dark"];

const THEME_ICONS: Record<ThemePref, IconName> = {
  dark: "moon",
  light: "sparkle",
  system: "desktop",
};

const THEME_LABELS: Record<ThemePref, string> = {
  dark: "Dark theme",
  light: "Light theme",
  system: "System theme",
};

const isThemeHost = (
  host: typeof globalThis
): host is ThemeHost & typeof globalThis => "studioTheme" in host;

const toThemeApi = (): ThemeApi | null => {
  const host = globalThis;

  if (!isThemeHost(host)) {
    return null;
  }

  return host.studioTheme ?? null;
};

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
];

const toThemeItems = (): MenuItem[] => {
  const api = toThemeApi();
  const pref = api?.get() ?? "system";

  return THEMES.map((value) => ({
    checked: pref === value,
    icon: THEME_ICONS[value],
    id: `theme-${value}`,
    label: THEME_LABELS[value],
    meta: null,
    run: () => api?.set(value),
  }));
};

const toNavItems = (
  header: StudioPaneHeaderProps,
  railShortcut: string
): MenuItem[] => [
  {
    checked: null,
    icon: "sidebar",
    id: "rail",
    label: pick(header.railOpen, "Hide project list", "Show project list"),
    meta: railShortcut,
    run: header.onToggleRail,
  },
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

export {
  handleMenuKey,
  toNavItems,
  toPanelItems,
  toProjectItems,
  toThemeItems,
};

export type { MenuItem };
