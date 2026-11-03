import { lazy } from "react";

const ContentPanel = lazy(async () => {
  const loaded = await import("./content-panel.js");

  return { default: loaded.ContentPanel };
});

export { ContentPanel };
