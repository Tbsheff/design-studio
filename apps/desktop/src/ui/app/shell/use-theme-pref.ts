import { useCallback, useSyncExternalStore } from "react";

type ThemePref = "dark" | "light" | "system";

const THEME_EVENT = "studio-theme";

const toThemePref = (value: string | undefined): ThemePref => {
  if (value === "light" || value === "system") {
    return value;
  }

  return "dark";
};

const readThemePref = (): ThemePref =>
  toThemePref(globalThis.document.documentElement.dataset.themePref);

const subscribeTheme = (onChange: () => void): (() => void) => {
  globalThis.addEventListener(THEME_EVENT, onChange);

  return (): void => {
    globalThis.removeEventListener(THEME_EVENT, onChange);
  };
};

const useThemePref = (): readonly [ThemePref, (next: ThemePref) => void] => {
  const pref = useSyncExternalStore(subscribeTheme, readThemePref);

  const setPref = useCallback((next: ThemePref): void => {
    globalThis.window.studioTheme?.set(next);
  }, []);

  return [pref, setPref];
};

export { useThemePref };

export type { ThemePref };
