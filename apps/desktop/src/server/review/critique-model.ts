import os from "node:os";

import type {
  Options,
  SDKMessage,
  SDKUserMessage,
} from "@anthropic-ai/claude-agent-sdk";

import { CRITIQUE_SYSTEM } from "./engine/index.js";

interface CritiqueShot {
  readonly base64: string;
  readonly label: string;
}

interface ModelAnswer {
  readonly costUsd: number;
  readonly text: string;
}

const DEFAULT_MODEL = "claude-sonnet-5-5";

const BUDGET_USD = 0.5;

const toMediaType = (base64: string): "image/jpeg" | "image/png" => {
  if (base64.startsWith("/9j/")) {
    return "image/jpeg";
  }

  return "image/png";
};

const toOptions = (): Options => ({
  cwd: os.tmpdir(),
  maxBudgetUsd: BUDGET_USD,
  maxTurns: 1,
  mcpServers: {},
  model: DEFAULT_MODEL,
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
  systemPrompt: CRITIQUE_SYSTEM,
  tools: [],
});

const toPrompt = (
  shots: readonly CritiqueShot[],
  text: string
): AsyncIterable<SDKUserMessage> => {
  const content = [
    ...shots.flatMap((shot) => [
      { text: shot.label, type: "text" as const },
      {
        source: {
          data: shot.base64,
          media_type: toMediaType(shot.base64),
          type: "base64" as const,
        },
        type: "image" as const,
      },
    ]),
    { text, type: "text" as const },
  ];

  const message: SDKUserMessage = {
    message: { content, role: "user" },
    parent_tool_use_id: null,
    type: "user",
  };

  return (async function* single() {
    yield message;
  })();
};

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

const toAnswer = async (
  stream: AsyncIterable<SDKMessage>
): Promise<ModelAnswer> => {
  let text = "";
  let costUsd = 0;

  for await (const message of stream) {
    if (message.type === "assistant") {
      text += toAssistantText(message.message.content);
    }

    if (message.type === "result") {
      costUsd = message.total_cost_usd;
      text = toResultText(message, text);
    }
  }

  return { costUsd, text };
};

const runCritiqueModel = async (
  shots: readonly CritiqueShot[],
  text: string
): Promise<ModelAnswer & { readonly model: string }> => {
  const { query } = await import("@anthropic-ai/claude-agent-sdk");
  const model = DEFAULT_MODEL;

  const stream = query({
    options: toOptions(),
    prompt: toPrompt(shots, text),
  });

  try {
    return { ...(await toAnswer(stream)), model };
  } finally {
    stream.close();
  }
};

export { runCritiqueModel };

export type { CritiqueShot, ModelAnswer };
