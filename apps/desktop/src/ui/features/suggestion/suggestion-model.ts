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

const isChipsShown = (
  chip: TweakChip | null,
  suggestionCount: number
): boolean => chip !== null || suggestionCount > 0;

export { isChipsShown, toKindLabel, toTweakChip, toTweakChipText };

export type { Suggestion, SuggestionResult, SuggestionRunIds, TweakChip };
