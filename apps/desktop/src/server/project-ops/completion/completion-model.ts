import os from "node:os";

import type { Options, SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import { Unavailable } from "@design-studio/actions/_core/errors/unavailable";
import { Effect, Stream } from "effect";

import { loadConfig } from "../../platform/config/index.js";

interface ModelCommand {
  readonly budgetUsd: number;
  readonly maxTokens: number;
  readonly model: string;
  readonly prompt: string;
  readonly system: string | null;
}

interface ModelAnswer {
  readonly costUsd: number;
  readonly model: string;
  readonly text: string;
}

const DEFAULT_MODEL = "claude-sonnet-5-5";

const MOCK_MODEL = "mock";

const MOCK_COST_USD = 0.001;

const MOCK_PROMPT_CHARS = 60;

const CHARS_PER_TOKEN = 4;

const MIN_BUDGET_USD = 0.01;

const DEFAULT_SYSTEM =
  "You answer for a prototype screen. Reply with the answer text only. Keep it short and plain.";

const toSystemText = (command: ModelCommand): string =>
  `${command.system ?? DEFAULT_SYSTEM}\nKeep the reply under ${command.maxTokens} tokens.`;

const toOptions = (command: ModelCommand): Options => ({
  cwd: os.tmpdir(),
  maxBudgetUsd: Math.max(command.budgetUsd, MIN_BUDGET_USD),
  maxTurns: 1,
  mcpServers: {},
  model: command.model,
  permissionMode: "default",
  persistSession: false,
  settingSources: [],
  settings: {
    disableBundledSkills: true,
    syncClaudeAiPlugins: false,
    syncClaudeAiSkills: false,
  },
  skills: [],
  strictMcpConfig: true,
  systemPrompt: toSystemText(command),
  tools: [],
});

type AssistantContent = Extract<
  SDKMessage,
  { type: "assistant" }
>["message"]["content"];

const toAssistantText = (content: AssistantContent): string =>
  content
    .flatMap((block) => {
      if (block.type === "text") {
        return [block.text];
      }

      return [];
    })
    .join("");

const toResultText = (
  message: Extract<SDKMessage, { type: "result" }>,
  fallback: string
): string => {
  if (message.subtype === "success" && message.result) {
    return message.result;
  }

  return fallback;
};

interface Folded {
  readonly costUsd: number;
  readonly text: string;
}

const toFolded = (folded: Folded, message: SDKMessage): Folded => {
  if (message.type === "assistant") {
    return {
      costUsd: folded.costUsd,
      text: folded.text + toAssistantText(message.message.content),
    };
  }

  if (message.type === "result") {
    return {
      costUsd: message.total_cost_usd,
      text: toResultText(message, folded.text),
    };
  }

  return folded;
};

const toUnavailable = (): Unavailable =>
  new Unavailable({
    message:
      "Could not reach Claude. Check the Claude sign-in, then try again.",
  });

const toEmptyFold = (): Folded => ({ costUsd: 0, text: "" });

const toMockAnswer = (command: ModelCommand): ModelAnswer => ({
  costUsd: MOCK_COST_USD,
  model: MOCK_MODEL,
  text: `Mock reply: ${command.prompt.slice(0, MOCK_PROMPT_CHARS)}`,
});

const runSdkAnswer = Effect.fn("CompletionModel.runSdk")(function* run(
  command: ModelCommand
) {
  const sdk = yield* Effect.tryPromise({
    catch: toUnavailable,
    try: () => import("@anthropic-ai/claude-agent-sdk"),
  });

  const folded = yield* Effect.acquireUseRelease(
    Effect.sync(() =>
      sdk.query({ options: toOptions(command), prompt: command.prompt })
    ),
    (stream) =>
      Stream.fromAsyncIterable(stream, toUnavailable).pipe(
        Stream.runFold(toEmptyFold, toFolded)
      ),
    (stream) => Effect.sync(() => stream.close())
  );

  const answer: ModelAnswer = {
    costUsd: folded.costUsd,
    model: command.model,
    text: folded.text.slice(0, command.maxTokens * CHARS_PER_TOKEN),
  };

  return answer;
});

const runCompletionAnswer = Effect.fn("CompletionModel.run")(function* run(
  command: ModelCommand
) {
  if (loadConfig().agentMode === "mock") {
    return toMockAnswer(command);
  }

  return yield* runSdkAnswer(command);
});

export { DEFAULT_MODEL, MOCK_MODEL, runCompletionAnswer };

export type { ModelAnswer, ModelCommand };
