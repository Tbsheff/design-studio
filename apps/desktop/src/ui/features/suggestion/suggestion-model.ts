import { copy } from "./copy.js";
import type { RouteOutput, suggestionRoutes } from "./deps.js";

type SuggestionResult = RouteOutput<typeof suggestionRoutes.runSuggestion>;

type Suggestion = SuggestionResult["suggestions"][number];

interface SuggestionRunIds {
  readonly directionId: string;
  readonly projectId: string;
  readonly runId: string;
}

type TweakChip = "add" | "open";

const MAX_CHIPS = 2;

const toKindLabel = (kind: Suggestion["kind"]): string => copy[kind];

const toTweakChip = (
  tweakCount: number | null,
  isAppProject: boolean
): TweakChip | null => {
  if (isAppProject || tweakCount === null) {
    return null;
  }

  if (tweakCount === 0) {
    return "add";
  }

  return "open";
};

const toTweakChipText = (chip: TweakChip): string => {
  if (chip === "add") {
    return copy.addTweaks;
  }

  return copy.openTweaks;
};

const toShownSuggestions = (
  suggestions: readonly Suggestion[],
  chip: TweakChip | null
): readonly Suggestion[] => {
  let room = MAX_CHIPS;

  if (chip !== null) {
    room -= 1;
  }

  const kinds = new Set<Suggestion["kind"]>();
  const shown: Suggestion[] = [];

  for (const suggestion of suggestions) {
    if (shown.length < room && !kinds.has(suggestion.kind)) {
      kinds.add(suggestion.kind);
      shown.push(suggestion);
    }
  }

  return shown;
};

const isChipsShown = (
  chip: TweakChip | null,
  suggestionCount: number
): boolean => chip !== null || suggestionCount > 0;

export {
  isChipsShown,
  toKindLabel,
  toShownSuggestions,
  toTweakChip,
  toTweakChipText,
};

export type { Suggestion, SuggestionResult, SuggestionRunIds, TweakChip };
