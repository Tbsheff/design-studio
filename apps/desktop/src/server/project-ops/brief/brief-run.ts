import { Duration, Effect } from "effect";

import { loadConfig } from "../../platform/config/index.js";
import { runCompletionAnswer } from "../completion/index.js";
import type { BriefContext, BriefResult } from "./brief-model.js";
import { BRIEF_SYSTEM, toBriefPrompt } from "./engine/to-brief-prompt.js";
import { toMockBrief } from "./engine/to-mock-brief.js";

const BRIEF_MODEL = "claude-haiku-5-5";

const OFFLINE_MODEL = "offline";

const MOCK_MODEL = "mock";

const BRIEF_TIMEOUT_SECONDS = 20;

const BRIEF_TIMEOUT = Duration.seconds(BRIEF_TIMEOUT_SECONDS);

const BRIEF_BUDGET_USD = 0.02;

const BRIEF_TOKENS = 500;

const toGrounded = (context: BriefContext): boolean =>
  context.designMd !== null ||
  context.routes.length > 0 ||
  context.kit.length > 0;

const toOfflineResult = (
  prompt: string,
  context: BriefContext,
  model: string
): BriefResult => ({
  brief: toMockBrief(prompt, context),
  isGrounded: toGrounded(context),
  model,
});

const toModelResult = Effect.fn("Brief.toModelResult")(function* run(
  prompt: string,
  context: BriefContext
) {
  const answer = yield* runCompletionAnswer({
    budgetUsd: BRIEF_BUDGET_USD,
    maxTokens: BRIEF_TOKENS,
    model: BRIEF_MODEL,
    prompt: toBriefPrompt(prompt, context),
    system: BRIEF_SYSTEM,
  });

  const brief = answer.text.trim();

  if (brief === "") {
    return toOfflineResult(prompt, context, OFFLINE_MODEL);
  }

  const result: BriefResult = {
    brief,
    isGrounded: toGrounded(context),
    model: BRIEF_MODEL,
  };

  return result;
});

const runBriefModel = Effect.fn("Brief.runBriefModel")(function* run(
  prompt: string,
  context: BriefContext
) {
  if (loadConfig().agentMode === "mock") {
    return toOfflineResult(prompt, context, MOCK_MODEL);
  }

  return yield* toModelResult(prompt, context).pipe(
    Effect.timeout(BRIEF_TIMEOUT),
    Effect.orElseSucceed(() => toOfflineResult(prompt, context, OFFLINE_MODEL))
  );
});

export { runBriefModel };
