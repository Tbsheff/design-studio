import type { TokenChange } from "@design-studio/contracts";

import { copy } from "./copy.js";
import type { RouteOutput, themeRoutes } from "./deps.js";

type ThemeList = RouteOutput<typeof themeRoutes.listTheme>;

type ThemeItem = ThemeList["items"][number];

type ThemeMode = "dark" | "light";

interface ThemeLook {
  readonly accent: string;
  readonly bg: string;
  readonly fg: string;
  readonly font: string | null;
  readonly primary: string;
  readonly surface: string;
}

const SEED_RANGE = 2_000_000_000;

const FALLBACK = "transparent";

const toColor = (item: ThemeItem, role: string, mode: ThemeMode): string => {
  const change = item.changes.find((entry) => entry.role === role) ?? null;

  if (change === null) {
    return FALLBACK;
  }

  if (mode === "dark") {
    return change.darkValue ?? change.value;
  }

  return change.value;
};

const toLook = (item: ThemeItem, mode: ThemeMode): ThemeLook => ({
  accent: toColor(item, "accent", mode),
  bg: toColor(item, "bg", mode),
  fg: toColor(item, "fg", mode),
  font: item.changes.find((entry) => entry.role === "display")?.value ?? null,
  primary: toColor(item, "primary", mode),
  surface: toColor(item, "surface", mode),
});

const toTokenChanges = (item: ThemeItem): TokenChange[] =>
  item.changes.map((change) => {
    if (change.darkValue === null) {
      return { path: change.path, value: change.value };
    }

    return {
      darkValue: change.darkValue,
      path: change.path,
      value: change.value,
    };
  });

const toSourceLabel = (item: ThemeItem): string | null => {
  const source = item.source ?? null;

  if (source === null) {
    return null;
  }

  if (source.kind === "image") {
    return source.value.split("/").pop() ?? source.value;
  }

  try {
    return new URL(source.value).hostname;
  } catch {
    return source.value;
  }
};

const toSourceTip = (item: ThemeItem): string =>
  `${copy.sourceTip}: ${item.source?.value ?? ""}`;

const toRandomSeed = (): number => Math.floor(Math.random() * SEED_RANGE);

export { toLook, toRandomSeed, toSourceLabel, toSourceTip, toTokenChanges };

export type { ThemeItem, ThemeLook, ThemeMode };
