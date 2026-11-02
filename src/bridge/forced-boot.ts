import { createForceState } from "./force-state.js";
import type { ForcedState } from "./force-state.js";

interface ForcedFromUrl {
  readonly selector: string | null;
  readonly state: ForcedState | "dark";
}

const ROOT_SELECTOR = ":root";
const WATCH_MS = 10_000;

const statesOf = (forced: ForcedFromUrl): ForcedState[] => {
  if (forced.state === "dark") {
    return [];
  }

  return [forced.state];
};

const selectorOf = (forced: ForcedFromUrl): string => {
  if (forced.selector === null) {
    return ROOT_SELECTOR;
  }

  return forced.selector;
};

const watchPage = (schedule: () => void): void => {
  const observer = new MutationObserver(schedule);

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  globalThis.setTimeout(() => {
    observer.disconnect();
  }, WATCH_MS);
};

const forceStateFromUrl = (forced: ForcedFromUrl | null): void => {
  if (forced === null) {
    return;
  }

  const isDark = forced.state === "dark";

  if (isDark) {
    document.documentElement.classList.add("dark");
  }

  const control = createForceState(() => null);

  const apply = (): void => {
    control.set(selectorOf(forced), statesOf(forced), isDark, false);
  };

  apply();
  watchPage(control.schedule);
  document.addEventListener("DOMContentLoaded", apply, { once: true });
  globalThis.addEventListener("load", apply, { once: true });
};

export { forceStateFromUrl };

export type { ForcedFromUrl };
