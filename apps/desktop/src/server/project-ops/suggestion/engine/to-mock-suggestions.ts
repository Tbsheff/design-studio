import type { Suggestion, SuggestionContext } from "../suggestion-model.js";
import { toShortPrompt } from "./to-suggestion-text.js";

const toTarget = (context: SuggestionContext): string => {
  if (context.route !== null && context.route !== "") {
    return context.route;
  }

  const file = context.files.at(0) ?? null;

  if (file === null) {
    return "the page";
  }

  return file.split("/").at(-1) ?? file;
};

const toLastSuggestion = (
  context: SuggestionContext,
  target: string
): Suggestion => {
  const finding = context.findings.at(0) ?? null;

  if (finding === null) {
    return {
      kind: "responsive",
      prompt: toShortPrompt(`Make ${target} work well at 375px mobile width`),
    };
  }

  return {
    kind: "review",
    prompt: toShortPrompt(`Fix this review finding: ${finding.message}`),
  };
};

const toMockSuggestions = (
  context: SuggestionContext
): readonly Suggestion[] => {
  const target = toTarget(context);

  return [
    {
      kind: "refine",
      prompt: toShortPrompt(
        `Polish the spacing and type hierarchy of ${target}`
      ),
    },
    {
      kind: "state",
      prompt: toShortPrompt(`Add empty, loading and error states to ${target}`),
    },
    toLastSuggestion(context, target),
  ];
};

export { toMockSuggestions };
