import type { RouteOutput, suggestionRoutes } from "./deps.js";

type SuggestionResult = RouteOutput<typeof suggestionRoutes.runSuggestion>;

type Suggestion = SuggestionResult["suggestions"][number];

interface SuggestionRunIds {
  readonly directionId: string;
  readonly projectId: string;
  readonly runId: string;
}

const SHOWN_MAX = 2;

const toShownSuggestions = (
  suggestions: readonly Suggestion[]
): readonly Suggestion[] =>
  suggestions
    .filter((suggestion) => suggestion.kind !== "review")
    .slice(0, SHOWN_MAX);

export { toShownSuggestions };

export type { Suggestion, SuggestionResult, SuggestionRunIds };
