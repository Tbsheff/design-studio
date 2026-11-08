import { lazy } from "react";

const CompletionPanel = lazy(async () => {
  const loaded = await import("./completion-panel.js");

  return { default: loaded.CompletionPanel };
});

export { CompletionPanel };
