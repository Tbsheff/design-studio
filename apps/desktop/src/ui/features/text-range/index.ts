import { lazy } from "react";

const TextRangeBar = lazy(async () => {
  const loaded = await import("./text-range-bar.js");

  return { default: loaded.TextRangeBar };
});

export { TextRangeBar };

export type { TextRangeSetup } from "./use-text-range.js";
