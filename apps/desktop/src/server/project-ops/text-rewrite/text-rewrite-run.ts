import { Duration, Effect } from "effect";

import { loadConfig } from "../../platform/config/index.js";
import { runCompletionAnswer } from "../completion/index.js";
import { OPTION_COUNT, toMockOptions } from "./engine/to-mock-options.js";
import {
  REWRITE_SYSTEM,
  toParsedOptions,
  toRewritePrompt,
} from "./engine/to-rewrite-prompt.js";
import type {
  RewriteContext,
  RewriteOptions,
  RewriteRequest,
} from "./text-rewrite-model.js";

const REWRITE_MODEL = "claude-haiku-5-5";

const OFFLINE_MODEL = "offline";

const MOCK_MODEL = "mock";

const REWRITE_TIMEOUT_SECONDS = 20;

const REWRITE_TIMEOUT = Duration.seconds(REWRITE_TIMEOUT_SECONDS);

const REWRITE_BUDGET_USD = 0.02;

const REWRITE_TOKENS = 600;

const toFilled = (
  options: readonly string[],
  request: RewriteRequest
): readonly string[] => {
  const known = new Set(options);
  const extra = toMockOptions(request).filter((option) => !known.has(option));

  return [...options, ...extra].slice(0, OPTION_COUNT);
};

const toOfflineResult = (
  request: RewriteRequest,
  model: string
): RewriteOptions => ({ model, options: toMockOptions(request) });

const toModelResult = Effect.fn("TextRewrite.toModelResult")(function* run(
  request: RewriteRequest,
  context: RewriteContext
) {
  const answer = yield* runCompletionAnswer({
    budgetUsd: REWRITE_BUDGET_USD,
    maxTokens: REWRITE_TOKENS,
    model: REWRITE_MODEL,
    prompt: toRewritePrompt(request, context),
    system: REWRITE_SYSTEM,
  });

  const parsed = toParsedOptions(answer.text, request.text);

  if (parsed.length === 0) {
    return toOfflineResult(request, OFFLINE_MODEL);
  }

  const result: RewriteOptions = {
    model: REWRITE_MODEL,
    options: toFilled(parsed, request),
  };

  return result;
});

const runRewriteModel = Effect.fn("TextRewrite.runRewriteModel")(function* run(
  request: RewriteRequest,
  context: RewriteContext
) {
  if (loadConfig().agentMode === "mock") {
    return toOfflineResult(request, MOCK_MODEL);
  }

  return yield* toModelResult(request, context).pipe(
    Effect.timeout(REWRITE_TIMEOUT),
    Effect.orElseSucceed(() => toOfflineResult(request, OFFLINE_MODEL))
  );
});

export { runRewriteModel };
