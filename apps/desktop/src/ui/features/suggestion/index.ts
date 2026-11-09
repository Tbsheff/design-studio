import { lazy } from "react";

const SuggestionChips = lazy(async () => {
  const loaded = await import("./suggestion-chips.js");

  return { default: loaded.SuggestionChips };
});

export { SuggestionChips };
