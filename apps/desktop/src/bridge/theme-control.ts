import { applyDarkMedia, removeDarkMedia } from "./dark-media.js";

interface ThemeControl {
  readonly set: (theme: unknown) => void;
}

interface OriginalTheme {
  readonly colorScheme: string;
  readonly dark: boolean;
  readonly hadTheme: boolean;
  readonly theme: string;
}

const createThemeControl = (): ThemeControl => {
  let original: OriginalTheme | null = null;

  const restore = (): void => {
    removeDarkMedia();

    if (!original) {
      return;
    }

    const root = document.documentElement;

    if (original.hadTheme) {
      root.dataset.theme = original.theme;
    } else {
      delete root.dataset.theme;
    }

    root.classList.toggle("dark", original.dark);
    root.style.colorScheme = original.colorScheme;

    if (root.getAttribute("class") === "") {
      root.removeAttribute("class");
    }

    if (root.getAttribute("style") === "") {
      root.removeAttribute("style");
    }

    original = null;
  };

  const set = (theme: unknown): void => {
    if (theme === null) {
      restore();

      return;
    }

    if (theme !== "light" && theme !== "dark") {
      return;
    }

    const root = document.documentElement;
    original ??= {
      colorScheme: root.style.colorScheme,
      dark: root.classList.contains("dark"),
      hadTheme: "theme" in root.dataset,
      theme: root.dataset.theme ?? "",
    };
    root.dataset.theme = theme;
    root.classList.toggle("dark", theme === "dark");
    root.style.colorScheme = theme;

    if (theme === "dark") {
      applyDarkMedia();
    } else {
      removeDarkMedia();
    }
  };

  return { set };
};

export { createThemeControl };

export type { ThemeControl };
