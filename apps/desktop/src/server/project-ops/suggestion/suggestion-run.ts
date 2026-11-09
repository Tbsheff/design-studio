import { Duration, Effect } from "effect";

import { loadConfig } from "../../platform/config/index.js";
import { runCompletionAnswer } from "../completion/index.js";
import { toMockSuggestions } from "./engine/to-mock-suggestions.js";
import {
  SUGGESTION_SYSTEM,
  toSuggestionPrompt,
} from "./engine/to-suggestion-prompt.js";
import { SUGGESTION_COUNT, toSuggestions } from "./engine/to-suggestions.js";
import type {
  SuggestionContext,
  SuggestionResult,
} from "./suggestion-model.js";

const SUGGESTION_MODEL = "claude-haiku-5-5";

const OFFLINE_MODEL = "offline";

const MOCK_MODEL = "mock";

const SUGGESTION_TIMEOUT_SECONDS = 20;

const SUGGESTION_TIMEOUT = Duration.seconds(SUGGESTION_TIMEOUT_SECONDS);

const SUGGESTION_BUDGET_USD = 0.02;

const SUGGESTION_TOKENS = 300;

const toOfflineResult = (
  context: SuggestionContext,
  model: string
): SuggestionResult => ({
  model,
  suggestions: toMockSuggestions(context),
});

const toModelResult = Effect.fn("Suggestion.toModelResult")(function* run(
  context: SuggestionContext
) {
  const answer = yield* runCompletionAnswer({
    budgetUsd: SUGGESTION_BUDGET_USD,
    maxTokens: SUGGESTION_TOKENS,
    model: SUGGESTION_MODEL,
    prompt: toSuggestionPrompt(context),
    system: SUGGESTION_SYSTEM,
  });

  const suggestions = toSuggestions(answer.text);

  if (suggestions.length < SUGGESTION_COUNT) {
    return toOfflineResult(context, OFFLINE_MODEL);
  }

  const result: SuggestionResult = { model: SUGGESTION_MODEL, suggestions };

  return result;
});

const runSuggestionModel = Effect.fn("Suggestion.runSuggestionModel")(
  function* run(context: SuggestionContext) {
    if (loadConfig().agentMode === "mock") {
      return toOfflineResult(context, MOCK_MODEL);
    }

    return yield* toModelResult(context).pipe(
      Effect.timeout(SUGGESTION_TIMEOUT),
      Effect.orElseSucceed(() => toOfflineResult(context, OFFLINE_MODEL))
    );
  }
);

export { runSuggestionModel };
