import { lazy } from "react";

const RulesEditor = lazy(async () => {
  const loaded = await import("./rules-editor.js");

  return { default: loaded.RulesEditor };
});

const ReviewPanel = lazy(async () => {
  const loaded = await import("./review-panel.js");

  return { default: loaded.ReviewPanel };
});

export { toFixPrompt } from "./errors-model.js";

export { ReviewPanel, RulesEditor };
