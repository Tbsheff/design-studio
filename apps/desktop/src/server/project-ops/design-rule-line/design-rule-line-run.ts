import { BadRequest } from "@design-studio/actions/_core/errors/bad-request";
import { Duration, Effect } from "effect";

import { loadConfig } from "../../platform/config/index.js";
import { runCompletionAnswer } from "../completion/index.js";
import { toMockRuleLine } from "./engine/to-mock-rule-line.js";
import { toRuleLine } from "./engine/to-rule-line.js";
import { RULE_SYSTEM, toRulePrompt } from "./engine/to-rule-prompt.js";

interface DesignRuleLine {
  readonly line: string;
  readonly model: string;
}

interface LineAnswer {
  readonly line: string | null;
  readonly model: string;
}

const RULE_MODEL = "claude-haiku-5-5";

const MOCK_MODEL = "mock";

const OFFLINE_MODEL = "offline";

const RULE_TIMEOUT_SECONDS = 20;

const RULE_BUDGET_USD = 0.02;

const RULE_TOKENS = 120;

const NO_RULE_MESSAGE = "Say what to always or never do";

const toModelAnswer = Effect.fn("DesignRuleLine.toModelAnswer")(function* run(
  text: string
) {
  const answer = yield* runCompletionAnswer({
    budgetUsd: RULE_BUDGET_USD,
    maxTokens: RULE_TOKENS,
    model: RULE_MODEL,
    prompt: toRulePrompt(text),
    system: RULE_SYSTEM,
  });

  const result: LineAnswer = {
    line: toRuleLine(answer.text),
    model: RULE_MODEL,
  };

  return result;
});

const toLineAnswer = Effect.fn("DesignRuleLine.toLineAnswer")(function* run(
  text: string
) {
  if (loadConfig().agentMode === "mock") {
    const mock: LineAnswer = { line: toMockRuleLine(text), model: MOCK_MODEL };

    return mock;
  }

  return yield* toModelAnswer(text).pipe(
    Effect.timeout(Duration.seconds(RULE_TIMEOUT_SECONDS)),
    Effect.orElseSucceed((): LineAnswer => ({
      line: toMockRuleLine(text),
      model: OFFLINE_MODEL,
    }))
  );
});

const runDesignRuleLine = Effect.fn("DesignRuleLine.run")(function* run(
  text: string
) {
  const answer = yield* toLineAnswer(text);

  if (answer.line === null) {
    return yield* new BadRequest({ message: NO_RULE_MESSAGE });
  }

  const result: DesignRuleLine = { line: answer.line, model: answer.model };

  return result;
});

export { runDesignRuleLine };

export type { DesignRuleLine };
