import { copy } from "./copy.js";
import type { RouteOutput, suggestionRoutes } from "./deps.js";

type SuggestionResult = RouteOutput<typeof suggestionRoutes.runSuggestion>;

type Suggestion = SuggestionResult["suggestions"][number];

interface SuggestionRunIds {
  readonly directionId: string;
  readonly projectId: string;
  readonly runId: string;
}

const toKindLabel = (kind: Suggestion["kind"]): string => copy[kind];

export { toKindLabel };

export type { Suggestion, SuggestionResult, SuggestionRunIds };
