interface ThemeControl {
  readonly set: (theme: unknown) => void;
}

const createThemeControl = (): ThemeControl => {
  let original: { dark: boolean; hadTheme: boolean; theme: string } | null =
    null;

  const restore = (): void => {
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

    if (root.getAttribute("class") === "") {
      root.removeAttribute("class");
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
      dark: root.classList.contains("dark"),
      hadTheme: "theme" in root.dataset,
      theme: root.dataset.theme ?? "",
    };
    root.dataset.theme = theme;
    root.classList.toggle("dark", theme === "dark");
  };

  return { set };
};

export { createThemeControl };

export type { ThemeControl };
