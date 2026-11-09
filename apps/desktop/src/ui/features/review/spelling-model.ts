import type { RouteOutput, spellingRoutes } from "./deps.js";

type SpellingView = RouteOutput<typeof spellingRoutes.inspectSpelling>;

type SpellingHitView = SpellingView["items"][number];

const toWordsWith = (words: readonly string[], word: string): string[] => {
  const key = word.toLowerCase();

  return [...words.filter((entry) => entry.toLowerCase() !== key), key];
};

const toFirstSelector = (hit: SpellingHitView): string | null =>
  hit.selectors[0] ?? null;

export { toFirstSelector, toWordsWith };

export type { SpellingHitView, SpellingView };
