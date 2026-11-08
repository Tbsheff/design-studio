import type { RunLevel } from "@design-studio/contracts";
import { useSyncExternalStore } from "react";

import { pick } from "./pick.js";
import { isNumber, isObject, isString } from "./value-guards.js";

const VIEWPORT_PRESETS = ["desktop", "tablet", "mobile", "custom"] as const;

type ViewportPreset = (typeof VIEWPORT_PRESETS)[number];

interface Viewport {
  preset: ViewportPreset;
  width: number;
  height: number;
}

type ZoomSetting = "fit" | number;

type Screen = "home" | "new-design-system" | "design-systems";

interface LibraryFrom {
  projectId: string;
  directionId: string;
}

const HOME_SCREEN: Screen = "home";
const LIBRARY_SCREEN: Screen = "design-systems";

const SCREENS: ReadonlySet<Screen> = new Set<Screen>([
  HOME_SCREEN,
  "new-design-system",
  LIBRARY_SCREEN,
]);

interface UiState {
  activeProjectId: string | null;
  screen: Screen;
  libraryFrom: LibraryFrom | null;
  returnTo: Screen;
  directionByProject: Record<string, string>;
  viewport: Viewport;
  zoom: ZoomSetting;
  chatWidth: number | null;
  lastPackId: string | null;
  lastLocation: string | null;
  snapByProject: Record<string, boolean>;
  homeSort: HomeSort;
  layersOpen: boolean;
  paneCollapsed: boolean;
  viewRowOpen: boolean;
  rulers: boolean;
}

type HomeSort = "recent" | "name" | "created";

const HOME_SORTS: readonly HomeSort[] = ["recent", "name", "created"];

const KEY = "design-studio.ui.v1";

const defaults: UiState = {
  activeProjectId: null,
  chatWidth: null,
  directionByProject: {},
  homeSort: "recent",
  lastLocation: null,
  lastPackId: null,
  layersOpen: false,
  libraryFrom: null,
  paneCollapsed: false,
  returnTo: HOME_SCREEN,
  rulers: false,
  screen: HOME_SCREEN,
  snapByProject: {},
  viewRowOpen: false,
  viewport: { height: 900, preset: "desktop", width: 1440 },
  zoom: "fit",
};

const libraryFromOf = (
  from: Partial<LibraryFrom> | null | undefined
): LibraryFrom | null => {
  if (isString(from?.projectId) && isString(from.directionId)) {
    return { directionId: from.directionId, projectId: from.projectId };
  }

  return null;
};

const isPatchFunction = (
  patch: Partial<UiState> | ((previous: UiState) => Partial<UiState>)
): patch is (previous: UiState) => Partial<UiState> =>
  typeof patch === "function";

const toPatchValue = (
  patch: Partial<UiState> | ((previous: UiState) => Partial<UiState>),
  previous: UiState
): Partial<UiState> => {
  if (isPatchFunction(patch)) {
    return patch(previous);
  }

  return patch;
};

const loadUiState = (): UiState => {
  try {
    const raw = localStorage.getItem(KEY);

    if (!raw) {
      return defaults;
    }

    const parsed: Partial<UiState> = JSON.parse(raw);

    return {
      activeProjectId: parsed.activeProjectId ?? null,
      chatWidth: pick(
        isNumber(parsed.chatWidth),
        parsed.chatWidth ?? null,
        null
      ),
      directionByProject: parsed.directionByProject ?? {},
      homeSort: pick(
        Boolean(parsed.homeSort && HOME_SORTS.includes(parsed.homeSort)),
        parsed.homeSort ?? "recent",
        "recent"
      ),
      lastLocation: pick(
        isString(parsed.lastLocation) && parsed.lastLocation.startsWith("/"),
        parsed.lastLocation ?? null,
        null
      ),
      lastPackId: pick(
        isString(parsed.lastPackId),
        parsed.lastPackId ?? null,
        null
      ),
      layersOpen: parsed.layersOpen === true,
      libraryFrom: pick(
        parsed.screen === LIBRARY_SCREEN,
        libraryFromOf(parsed.libraryFrom),
        null
      ),
      paneCollapsed: parsed.paneCollapsed === true,
      returnTo: pick(
        parsed.returnTo === LIBRARY_SCREEN,
        LIBRARY_SCREEN,
        HOME_SCREEN
      ),
      rulers: parsed.rulers === true,
      screen: pick(
        Boolean(parsed.screen && SCREENS.has(parsed.screen)),
        parsed.screen ?? HOME_SCREEN,
        HOME_SCREEN
      ),
      snapByProject: pick(
        isObject(parsed.snapByProject),
        parsed.snapByProject ?? {},
        {}
      ),
      viewRowOpen: parsed.viewRowOpen === true,
      viewport: parsed.viewport ?? defaults.viewport,
      zoom: parsed.zoom ?? defaults.zoom,
    };
  } catch {
    return defaults;
  }
};

const saveUiState = (state: UiState): boolean => {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));

    return true;
  } catch {
    return false;
  }
};

let state: UiState = loadUiState();
const listeners = new Set<() => void>();

const uiStore = {
  get: (): UiState => state,
  set: (
    patch: Partial<UiState> | ((previous: UiState) => Partial<UiState>)
  ): void => {
    const next = toPatchValue(patch, state);
    state = { ...state, ...next };
    saveUiState(state);

    for (const listener of listeners) {
      listener();
    }
  },
  subscribe: (listener: () => void) => {
    listeners.add(listener);

    return (): void => {
      listeners.delete(listener);
    };
  },
};

const useUi = (): UiState =>
  useSyncExternalStore(uiStore.subscribe, uiStore.get);

interface DraftStore {
  get: () => string;
  set: (value: string) => void;
  subscribe: (listener: () => void) => () => void;
}

const createDraftStore = (initial = ""): DraftStore => {
  let value = initial;
  const draftListeners = new Set<() => void>();

  return {
    get: () => value,
    set: (next) => {
      if (next === value) {
        return;
      }

      value = next;

      for (const listener of draftListeners) {
        listener();
      }
    },
    subscribe: (listener) => {
      draftListeners.add(listener);

      return () => {
        draftListeners.delete(listener);
      };
    },
  };
};

const useDraft = (store: DraftStore): string =>
  useSyncExternalStore(store.subscribe, store.get);

const useDraftActive = (store: DraftStore): boolean =>
  useSyncExternalStore(store.subscribe, () => store.get().trim() !== "");

interface HomeVariationsIntent {
  projectId: string;
  prompt: string;
  count: number;
  level: RunLevel;
}

let homeIntent: HomeVariationsIntent | null = null;

const homeVariations = {
  set: (intent: HomeVariationsIntent): void => {
    homeIntent = intent;
  },
  take: (projectId: string): HomeVariationsIntent | null => {
    if (homeIntent?.projectId !== projectId) {
      return null;
    }

    const intent = homeIntent;
    homeIntent = null;

    return intent;
  },
};

const readStored = (key: string): string | null => {
  try {
    return globalThis.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeStored = (key: string, value: string): boolean => {
  try {
    globalThis.localStorage.setItem(key, value);

    return true;
  } catch {
    return false;
  }
};

const removeStored = (key: string): boolean => {
  try {
    globalThis.localStorage.removeItem(key);

    return true;
  } catch {
    return false;
  }
};

export {
  HOME_SORTS,
  uiStore,
  useUi,
  createDraftStore,
  useDraft,
  useDraftActive,
  homeVariations,
  readStored,
  writeStored,
  removeStored,
};

export type {
  Viewport,
  ZoomSetting,
  Screen,
  LibraryFrom,
  UiState,
  HomeSort,
  DraftStore,
};
