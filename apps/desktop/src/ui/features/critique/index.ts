import { lazy } from "react";

const CritiquePanel = lazy(async () => {
  const loaded = await import("./critique-panel.js");

  return { default: loaded.CritiquePanel };
});

export { CritiquePanel };
