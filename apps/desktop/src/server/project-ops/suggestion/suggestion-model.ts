type SuggestionKind = "refine" | "responsive" | "review" | "state";

interface Suggestion {
  readonly kind: SuggestionKind;
  readonly prompt: string;
}

interface SuggestionResult {
  readonly model: string;
  readonly suggestions: readonly Suggestion[];
}

interface SuggestionFinding {
  readonly message: string;
  readonly severity: string;
}

interface SuggestionContext {
  readonly designMd: string | null;
  readonly files: readonly string[];
  readonly finalText: string;
  readonly findings: readonly SuggestionFinding[];
  readonly prompt: string;
  readonly route: string | null;
}

interface RunCommand {
  readonly directionId: string;
  readonly projectId: string;
  readonly runId: string;
}

export type {
  RunCommand,
  Suggestion,
  SuggestionContext,
  SuggestionFinding,
  SuggestionKind,
  SuggestionResult,
};
