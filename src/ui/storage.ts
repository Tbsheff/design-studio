import { useSyncExternalStore } from 'react';
import type { RunLevel } from '../shared/contracts';

export interface Viewport {
  preset: 'desktop' | 'tablet' | 'mobile' | 'custom';
  width: number;
  height: number;
}

export type ZoomSetting = 'fit' | number;

export type Screen = 'home' | 'new-design-system';

interface UiState {
  activeProjectId: string | null;
  screen: Screen;
  directionByProject: Record<string, string>;
  viewport: Viewport;
  zoom: ZoomSetting;
  chatWidth: number | null;
  lastPackId: string | null;
  lastLocation: string | null;
  snapByProject: Record<string, boolean>;
}

const KEY = 'design-studio.ui.v1';

const defaults: UiState = {
  activeProjectId: null,
  screen: 'home',
  directionByProject: {},
  viewport: { preset: 'desktop', width: 1440, height: 900 },
  zoom: 'fit',
  chatWidth: null,
  lastPackId: null,
  lastLocation: null,
  snapByProject: {},
};

function loadUiState(): UiState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<UiState>;
    return {
      activeProjectId: parsed.activeProjectId ?? null,
      screen: parsed.screen === 'new-design-system' ? 'new-design-system' : 'home',
      directionByProject: parsed.directionByProject ?? {},
      viewport: parsed.viewport ?? defaults.viewport,
      zoom: parsed.zoom ?? defaults.zoom,
      chatWidth: typeof parsed.chatWidth === 'number' ? parsed.chatWidth : null,
      lastPackId: typeof parsed.lastPackId === 'string' ? parsed.lastPackId : null,
      lastLocation: typeof parsed.lastLocation === 'string' && parsed.lastLocation.startsWith('/') ? parsed.lastLocation : null,
      snapByProject: parsed.snapByProject && typeof parsed.snapByProject === 'object' ? parsed.snapByProject : {},
    };
  } catch {
    return defaults;
  }
}

function saveUiState(state: UiState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    return;
  }
}

let state: UiState = loadUiState();
const listeners = new Set<() => void>();

export const uiStore = {
  get: () => state,
  set: (patch: Partial<UiState> | ((s: UiState) => Partial<UiState>)) => {
    const next = typeof patch === 'function' ? patch(state) : patch;
    state = { ...state, ...next };
    saveUiState(state);
    listeners.forEach((l) => l());
  },
  subscribe: (l: () => void) => {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
};

export function useUi(): UiState {
  return useSyncExternalStore(uiStore.subscribe, uiStore.get);
}

export interface DraftStore {
  get: () => string;
  set: (value: string) => void;
  subscribe: (listener: () => void) => () => void;
}

export function createDraftStore(initial = ''): DraftStore {
  let value = initial;
  const draftListeners = new Set<() => void>();
  return {
    get: () => value,
    set: (next) => {
      if (next === value) return;
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
}

export function useDraft(store: DraftStore): string {
  return useSyncExternalStore(store.subscribe, store.get);
}

export function useDraftActive(store: DraftStore): boolean {
  return useSyncExternalStore(store.subscribe, () => store.get().trim() !== '');
}

interface HomeVariationsIntent {
  projectId: string;
  prompt: string;
  count: number;
  level: RunLevel;
}

let homeIntent: HomeVariationsIntent | null = null;

export const homeVariations = {
  set: (intent: HomeVariationsIntent) => {
    homeIntent = intent;
  },
  take: (projectId: string): HomeVariationsIntent | null => {
    if (homeIntent?.projectId !== projectId) return null;
    const intent = homeIntent;
    homeIntent = null;
    return intent;
  },
};
