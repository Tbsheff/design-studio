import type { CompiledTokenEntry } from "@design-studio/contracts";

import { COPY } from "./copy.js";
import { aliasPath, referencedEntry, varTarget } from "./token-draft.js";

type ThemeId = "light" | "dark" | null;

interface ThemeEntry {
  readonly id: ThemeId;
  readonly label: string;
}

const THEMES: readonly ThemeEntry[] = [
  { id: "light", label: COPY.themeLight },
  { id: "dark", label: COPY.themeDark },
  { id: null, label: COPY.themeAuto },
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

const toChangeCount = (count: number): string => {
  if (count === 1) {
    return `${count} ${COPY.panelChange}`;
  }

  return `${count} ${COPY.panelChanges}`;
};

export { THEMES, toChangeCount, toSwatch };

export type { ThemeEntry, ThemeId };
