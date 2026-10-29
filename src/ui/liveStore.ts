import { useSyncExternalStore } from 'react';

export interface LiveStore<T> {
  get: () => T;
  set: (next: T) => void;
  subscribe: (listener: () => void) => () => void;
}

export function createLiveStore<T>(initial: T): LiveStore<T> {
  let value = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => value,
    set: (next) => {
      if (Object.is(next, value)) return;
      value = next;
      for (const listener of listeners) listener();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export function useLive<T>(store: LiveStore<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}
