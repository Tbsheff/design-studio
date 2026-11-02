import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

const media = (): MediaQueryList | null => {
  if (!("matchMedia" in globalThis)) {
    return null;
  }

  return globalThis.matchMedia(QUERY);
};

const subscribe = (notify: () => void): (() => void) => {
  const list = media();

  list?.addEventListener("change", notify);

  return (): void => {
    list?.removeEventListener("change", notify);
  };
};

const snapshot = (): boolean => media()?.matches ?? false;

const serverSnapshot = (): boolean => false;

const useReducedMotion = (): boolean =>
  useSyncExternalStore(subscribe, snapshot, serverSnapshot);

export { useReducedMotion };
