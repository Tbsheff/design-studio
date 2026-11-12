import type { CompiledTokenEntry } from "@design-studio/contracts";
import type { IconName } from "@design-studio/ui";

import { COPY } from "./copy.js";
import { aliasPath, referencedEntry, varTarget } from "./token-draft.js";

type ThemeId = "light" | "dark" | null;

interface ThemeEntry {
  readonly icon: IconName;
  readonly id: ThemeId;
  readonly label: string;
}

const THEMES: readonly ThemeEntry[] = [
  { icon: "sun", id: "light", label: COPY.themeLight },
  { icon: "moon", id: "dark", label: COPY.themeDark },
  { icon: "desktop", id: null, label: COPY.themeAuto },
];

const toSwatch = (
  value: string,
  isDark: boolean,
  entries: CompiledTokenEntry[]
): string => {
  if (!aliasPath(value) && !varTarget(value)) {
    return value;
  }

  const entry = referencedEntry(value, entries);

  if (!entry) {
    return "";
  }

  if (isDark && entry.darkValue) {
    return entry.darkValue;
  }

  return entry.value;
};

const toThemeIcon = (theme: ThemeId): IconName =>
  THEMES.find((entry) => entry.id === theme)?.icon ?? "desktop";

const toChangeCount = (count: number): string => {
  if (count === 1) {
    return `${count} ${COPY.panelChange}`;
  }

  return `${count} ${COPY.panelChanges}`;
};

export { THEMES, toChangeCount, toSwatch, toThemeIcon };

export type { ThemeEntry, ThemeId };
