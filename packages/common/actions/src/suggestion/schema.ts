import { Schema } from "effect";

const PROMPT_MAX = 80;

const SUGGESTION_COUNT = 3;

const SuggestionKindSchema = Schema.Literals([
  "refine",
  "state",
  "responsive",
  "review",
]).annotate({
  description:
    "What the prompt does: refine the look, cover a state, fit a viewport or fix a review finding.",
});

const SuggestionSchema = Schema.Struct({
  kind: SuggestionKindSchema,
  prompt: Schema.String.check(
    Schema.isMinLength(1),
    Schema.isMaxLength(PROMPT_MAX)
  ).annotate({ description: "The next prompt, 80 chars or less." }),
});

const SuggestionResultSchema = Schema.Struct({
  model: Schema.String,
  suggestions: Schema.Array(SuggestionSchema).check(
    Schema.isMaxLength(SUGGESTION_COUNT)
  ),
});

export { SuggestionKindSchema, SuggestionResultSchema, SuggestionSchema };
