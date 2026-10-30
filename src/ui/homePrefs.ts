import { useSyncExternalStore } from 'react';

export type HomeView = 'list' | 'grid';
export type HomeFilter = 'all' | 'prototypes' | 'apps' | 'systems';
const FILTERS: HomeFilter[] = ['all', 'prototypes', 'apps', 'systems'];

export interface HomePrefs {
  favorites: string[];
  favoritesOnly: boolean;
  view: HomeView;
  templatesShown: boolean;
  filter: HomeFilter;
}

const KEY = 'studio.home.v1';
const DEFAULTS: HomePrefs = { favorites: [], favoritesOnly: false, view: 'list', templatesShown: false, filter: 'all' };

function read(): HomePrefs {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<HomePrefs>;
    return {
      favorites: Array.isArray(raw.favorites) ? raw.favorites.filter((id): id is string => typeof id === 'string') : [],
      favoritesOnly: raw.favoritesOnly === true,
      view: raw.view === 'grid' ? 'grid' : 'list',
      templatesShown: raw.templatesShown === true,
      filter: FILTERS.includes(raw.filter as HomeFilter) ? (raw.filter as HomeFilter) : 'all',
    };
  } catch {
    return DEFAULTS;
  }
}

function saveQuietly(prefs: HomePrefs): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    return;
  }
}

let current = read();
const listeners = new Set<() => void>();

export const homePrefs = {
  get: () => current,
  set(patch: Partial<HomePrefs>) {
    current = { ...current, ...patch };
    saveQuietly(current);
    listeners.forEach((listener) => listener());
  },
  toggleFavorite(id: string) {
    const has = current.favorites.includes(id);
    homePrefs.set({ favorites: has ? current.favorites.filter((item) => item !== id) : [...current.favorites, id] });
  },
};

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useHomePrefs(): HomePrefs {
  return useSyncExternalStore(subscribe, homePrefs.get);
}
