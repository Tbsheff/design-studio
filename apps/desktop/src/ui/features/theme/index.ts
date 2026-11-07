import { lazy } from "react";

const ThemeStrip = lazy(async () => {
  const loaded = await import("./theme-strip.js");

  return { default: loaded.ThemeStrip };
});

export { ThemeStrip };
