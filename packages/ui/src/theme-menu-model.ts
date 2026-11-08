type ThemePref = "system" | "light" | "dark";

interface ThemeApi {
  get: () => ThemePref;
  set: (pref: ThemePref) => void;
}

interface ThemeOption {
  readonly label: string;
  readonly path: string;
  readonly pref: ThemePref;
}

const THEME_OPTIONS: readonly ThemeOption[] = [
  {
    label: "System",
    path: "M2.75 3.25h10.5v7.5H2.75zM6 13.25h4M8 10.75v2.5",
    pref: "system",
  },
  {
    label: "Light",
    path: "M8 5.25a2.75 2.75 0 1 0 0 5.5 2.75 2.75 0 0 0 0-5.5zM8 1.75v1.5M8 12.75v1.5M1.75 8h1.5M12.75 8h1.5M3.6 3.6l1.05 1.05M11.35 11.35l1.05 1.05M3.6 12.4l1.05-1.05M11.35 4.65l1.05-1.05",
    pref: "light",
  },
  {
    label: "Dark",
    path: "M13.25 9.75A5.5 5.5 0 1 1 6.25 2.75a4.5 4.5 0 0 0 7 7z",
    pref: "dark",
  },
];

const THEME_EVENT = "studio-theme";

interface ThemeHost {
  readonly studioTheme: ThemeApi | null;
}

const isThemeHost = (
  host: typeof globalThis
): host is ThemeHost & typeof globalThis => "studioTheme" in host;

const toThemeApi = (): ThemeApi | null => {
  const host = globalThis;

  if (!isThemeHost(host)) {
    return null;
  }

  return host.studioTheme ?? null;
};

const toThemePref = (): ThemePref => toThemeApi()?.get() ?? "system";

const subscribeTheme = (notify: () => void): (() => void) => {
  globalThis.addEventListener(THEME_EVENT, notify);

  return (): void => globalThis.removeEventListener(THEME_EVENT, notify);
};

const toMenuTarget = (
  key: string,
  index: number,
  count: number
): number | null => {
  if (key === "ArrowDown") {
    return index + 1;
  }

  if (key === "ArrowUp") {
    return index - 1;
  }

  if (key === "Home") {
    return 0;
  }

  if (key === "End") {
    return count - 1;
  }

  return null;
};

export { THEME_OPTIONS, subscribeTheme, toMenuTarget, toThemeApi, toThemePref };

export type { ThemeApi, ThemeOption, ThemePref };
