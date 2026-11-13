import { useSyncExternalStore } from "react";

import { readStored, writeStored } from "../../platform/storage.js";
import { isString } from "../../platform/value-guards.js";

type HomeView = "list" | "grid";

type HomeFilter = "all" | "prototypes" | "apps" | "systems";

const FILTERS: ReadonlyMap<string, HomeFilter> = new Map([
  ["all", "all"],
  ["prototypes", "prototypes"],
  ["apps", "apps"],
  ["systems", "systems"],
]);

interface HomePrefs {
  readonly editAppFolders: string[];
  readonly favorites: string[];
  readonly isFavoritesOnly: boolean;
  readonly view: HomeView;
  readonly hasTemplatesShown: boolean;
  readonly filter: HomeFilter;
  readonly lastWorkspaceId: string | null;
  readonly shouldAskFirst: boolean;
}

const KEY = "studio.home.v1";

const DEFAULTS: HomePrefs = {
  editAppFolders: [],
  favorites: [],
  filter: "all",
  hasTemplatesShown: false,
  isFavoritesOnly: false,
  lastWorkspaceId: null,
  shouldAskFirst: false,
  view: "list",
};

type StoredValue =
  | string
  | number
  | boolean
  | null
  | StoredValue[]
  | { readonly [key: string]: StoredValue };

interface StoredPrefs {
  readonly editAppFolders: StoredValue;
  readonly favorites: StoredValue;
  readonly favoritesOnly: StoredValue;
  readonly filter: StoredValue;
  readonly hasTemplatesShown: StoredValue;
  readonly isFavoritesOnly: StoredValue;
  readonly lastWorkspaceId: StoredValue;
  readonly shouldAskFirst: StoredValue;
  readonly templatesShown: StoredValue;
  readonly view: StoredValue;
}

const toStringList = (value: StoredValue): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((id): id is string => typeof id === "string");
};

const toLastWorkspaceId = (value: StoredValue): string | null => {
  if (isString(value) && value !== "") {
    return value;
  }

  return null;
};

const toFilter = (value: StoredValue): HomeFilter =>
  FILTERS.get(String(value)) ?? "all";

const toView = (value: StoredValue): HomeView => {
  if (value === "grid") {
    return "grid";
  }

  return "list";
};

const getPrefs = (): HomePrefs => {
  try {
    const raw: StoredPrefs | null = JSON.parse(readStored(KEY) ?? "{}");

    if (raw === null) {
      return DEFAULTS;
    }

    return {
      editAppFolders: toStringList(raw.editAppFolders),
      favorites: toStringList(raw.favorites),
      filter: toFilter(raw.filter),
      hasTemplatesShown:
        raw.hasTemplatesShown === true || raw.templatesShown === true,
      isFavoritesOnly:
        raw.isFavoritesOnly === true || raw.favoritesOnly === true,
      lastWorkspaceId: toLastWorkspaceId(raw.lastWorkspaceId),
      shouldAskFirst: raw.shouldAskFirst === true,
      view: toView(raw.view),
    };
  } catch {
    return DEFAULTS;
  }
};

const setPrefsQuietly = (prefs: HomePrefs): void => {
  writeStored(KEY, JSON.stringify(prefs));
};

const toFavoritesWith = (favorites: string[], id: string): string[] => {
  if (favorites.includes(id)) {
    return favorites.filter((item) => item !== id);
  }

  return [...favorites, id];
};

let current = getPrefs();
const listeners = new Set<() => void>();

const runListeners = (): void => {
  for (const listener of listeners) {
    listener();
  }
};

const homePrefs = {
  get: (): HomePrefs => current,
  set(patch: Partial<HomePrefs>): void {
    current = { ...current, ...patch };
    setPrefsQuietly(current);
    runListeners();
  },
  toggleFavorite(id: string): void {
    homePrefs.set({ favorites: toFavoritesWith(current.favorites, id) });
  },
};

const startPrefsSubscription = (listener: () => void): (() => void) => {
  listeners.add(listener);

  return (): void => {
    listeners.delete(listener);
  };
};

const useHomePrefs = (): HomePrefs =>
  useSyncExternalStore(startPrefsSubscription, homePrefs.get);

export { homePrefs, useHomePrefs };

export type { HomeFilter, HomePrefs, HomeView };
