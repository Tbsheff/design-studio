import { useSyncExternalStore } from "react";

interface LiveStore<State> {
  get: () => State;
  set: (next: State) => void;
  subscribe: (listener: () => void) => () => void;
}

const createLiveStore = <State>(initial: State): LiveStore<State> => {
  let value = initial;
  const listeners = new Set<() => void>();

  return {
    get: () => value,
    set: (next) => {
      if (Object.is(next, value)) {
        return;
      }

      value = next;

      for (const listener of listeners) {
        listener();
      }
    },
    subscribe: (listener) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
  };
};

const useLive = <State>(store: LiveStore<State>): State =>
  useSyncExternalStore(store.subscribe, store.get, store.get);

export { createLiveStore, useLive };

export type { LiveStore };
