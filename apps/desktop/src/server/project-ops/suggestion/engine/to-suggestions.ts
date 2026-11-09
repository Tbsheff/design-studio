import type { Suggestion, SuggestionKind } from "../suggestion-model.js";
import { toShortPrompt } from "./to-suggestion-text.js";

const SUGGESTION_COUNT = 3;

const KINDS: readonly SuggestionKind[] = [
  "refine",
  "state",
  "responsive",
  "review",
];

const BULLET = /^[-*\d.)\s]+/u;

const isKind = (value: string): value is SuggestionKind =>
  KINDS.some((kind) => kind === value);

const toSuggestionLine = (line: string): Suggestion | null => {
  const text = line.replace(BULLET, "");
  const colon = text.indexOf(":");

  if (colon === -1) {
    return null;
  }

  const kind = text.slice(0, colon).trim().toLowerCase();
  const prompt = toShortPrompt(text.slice(colon + 1));

  if (!isKind(kind) || prompt === "") {
    return null;
  }

  return { kind, prompt };
};

const toSuggestions = (text: string): readonly Suggestion[] => {
  const seen = new Set<string>();

  return text
    .split("\n")
    .flatMap((line) => {
      const suggestion = toSuggestionLine(line.trim());

      if (suggestion === null || seen.has(suggestion.prompt)) {
        return [];
      }

      seen.add(suggestion.prompt);

      return [suggestion];
    })
    .slice(0, SUGGESTION_COUNT);
};

export { SUGGESTION_COUNT, toSuggestions };
