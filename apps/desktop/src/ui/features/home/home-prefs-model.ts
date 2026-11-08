import { useSyncExternalStore } from "react";

import { readStored, writeStored } from "../../platform/storage.js";

type HomeView = "list" | "grid";

type HomeFilter = "all" | "prototypes" | "apps" | "systems";

const FILTERS: ReadonlySet<string> = new Set([
  "all",
  "prototypes",
  "apps",
  "systems",
]);

interface HomePrefs {
  readonly favorites: string[];
  readonly isFavoritesOnly: boolean;
  readonly view: HomeView;
  readonly hasTemplatesShown: boolean;
  readonly filter: HomeFilter;
}

interface LegacyHomePrefs {
  readonly favoritesOnly: unknown;
  readonly templatesShown: unknown;
}

const KEY = "studio.home.v1";

const DEFAULTS: HomePrefs = {
  favorites: [],
  filter: "all",
  hasTemplatesShown: false,
  isFavoritesOnly: false,
  view: "list",
};

const getPrefs = (): HomePrefs => {
  try {
    const raw = JSON.parse(readStored(KEY) ?? "{}") as Partial<HomePrefs> &
      Partial<LegacyHomePrefs>;

    return {
      favorites: Array.isArray(raw.favorites)
        ? raw.favorites.filter((id): id is string => typeof id === "string")
        : [],
      filter: FILTERS.has(String(raw.filter))
        ? (raw.filter as HomeFilter)
        : "all",
      hasTemplatesShown:
        raw.hasTemplatesShown === true || raw.templatesShown === true,
      isFavoritesOnly:
        raw.isFavoritesOnly === true || raw.favoritesOnly === true,
      view: raw.view === "grid" ? "grid" : "list",
    };
  } catch {
    return DEFAULTS;
  }
};

const setPrefsQuietly = (prefs: HomePrefs): void => {
  writeStored(KEY, JSON.stringify(prefs));
};

let current = getPrefs();
const listeners = new Set<() => void>();

const homePrefs = {
  get: () => current,
  set(patch: Partial<HomePrefs>): void {
    current = { ...current, ...patch };
    setPrefsQuietly(current);
    listeners.forEach((listener) => listener());
  },
  toggleFavorite(id: string): void {
    const has = current.favorites.includes(id);
    homePrefs.set({
      favorites: has
        ? current.favorites.filter((item) => item !== id)
        : [...current.favorites, id],
    });
  },
};

const startPrefsSubscription = (listener: () => void) => {
  listeners.add(listener);

  return (): void => {
    listeners.delete(listener);
  };
};

const useHomePrefs = (): HomePrefs =>
  useSyncExternalStore(startPrefsSubscription, homePrefs.get);

export { homePrefs, useHomePrefs };

export type { HomeFilter, HomePrefs, HomeView };
