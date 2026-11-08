import type { RunLevel } from "@design-studio/contracts";
import { useSyncExternalStore } from "react";

interface Viewport {
  preset: "desktop" | "tablet" | "mobile" | "custom";
  width: number;
  height: number;
}

type ZoomSetting = "fit" | number;

type Screen = "home" | "new-design-system" | "design-systems";

interface LibraryFrom {
  projectId: string;
  directionId: string;
}

const SCREENS: ReadonlySet<Screen> = new Set<Screen>([
  "home",
  "new-design-system",
  "design-systems",
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
  returnTo: "home",
  rulers: false,
  screen: "home",
  snapByProject: {},
  viewRowOpen: false,
  viewport: { height: 900, preset: "desktop", width: 1440 },
  zoom: "fit",
};

const libraryFromOf = (value: unknown): LibraryFrom | null => {
  const from = value as Partial<LibraryFrom> | null | undefined;

  return typeof from?.projectId === "string" &&
    typeof from.directionId === "string"
    ? { directionId: from.directionId, projectId: from.projectId }
    : null;
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
      chatWidth: typeof parsed.chatWidth === "number" ? parsed.chatWidth : null,
      directionByProject: parsed.directionByProject ?? {},
      homeSort:
        parsed.homeSort && HOME_SORTS.includes(parsed.homeSort)
          ? parsed.homeSort
          : "recent",
      lastLocation:
        typeof parsed.lastLocation === "string" &&
        parsed.lastLocation.startsWith("/")
          ? parsed.lastLocation
          : null,
      lastPackId:
        typeof parsed.lastPackId === "string" ? parsed.lastPackId : null,
      layersOpen: parsed.layersOpen === true,
      libraryFrom:
        parsed.screen === "design-systems"
          ? libraryFromOf(parsed.libraryFrom)
          : null,
      paneCollapsed: parsed.paneCollapsed === true,
      returnTo:
        parsed.returnTo === "design-systems" ? "design-systems" : "home",
      rulers: parsed.rulers === true,
      screen:
        parsed.screen && SCREENS.has(parsed.screen) ? parsed.screen : "home",
      snapByProject:
        parsed.snapByProject && typeof parsed.snapByProject === "object"
          ? parsed.snapByProject
          : {},
      viewRowOpen: parsed.viewRowOpen === true,
      viewport: parsed.viewport ?? defaults.viewport,
      zoom: parsed.zoom ?? defaults.zoom,
    };
  } catch {
    return defaults;
  }
};

const saveUiState = (state: UiState): void => {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    return;
  }
};

let state: UiState = loadUiState();
const listeners = new Set<() => void>();

const uiStore = {
  get: (): UiState => state,
  set: (patch: Partial<UiState> | ((s: UiState) => Partial<UiState>)): void => {
    const next = typeof patch === "function" ? patch(state) : patch;
    state = { ...state, ...next };
    saveUiState(state);
    listeners.forEach((l) => l());
  },
  subscribe: (l: () => void) => {
    listeners.add(l);

    return (): void => {
      listeners.delete(l);
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
      draftListeners.forEach((l) => l());
    },
    subscribe: (l) => {
      draftListeners.add(l);

      return () => {
        draftListeners.delete(l);
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

const writeStored = (key: string, value: string): void => {
  try {
    globalThis.localStorage.setItem(key, value);
  } catch {
    return;
  }
};

const removeStored = (key: string): void => {
  try {
    globalThis.localStorage.removeItem(key);
  } catch {
    return;
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
