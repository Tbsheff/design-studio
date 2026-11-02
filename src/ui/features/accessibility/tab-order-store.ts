import { useSyncExternalStore } from "react";

const listeners = new Set<() => void>();

const state = { isOn: false };

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);

  return (): void => {
    listeners.delete(listener);
  };
};

const readTabOrder = (): boolean => state.isOn;

const setTabOrder = (isOn: boolean): void => {
  if (state.isOn === isOn) {
    return;
  }

  state.isOn = isOn;

  for (const listener of listeners) {
    listener();
  }
};

const toggleTabOrder = (): void => setTabOrder(!state.isOn);

const useTabOrderOn = (): boolean =>
  useSyncExternalStore(subscribe, readTabOrder, readTabOrder);

export { setTabOrder, toggleTabOrder, useTabOrderOn };
