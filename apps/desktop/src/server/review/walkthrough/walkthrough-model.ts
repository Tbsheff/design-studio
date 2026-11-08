import { readFile } from "node:fs/promises";
import os from "node:os";

import type {
  Options,
  SDKMessage,
  SDKUserMessage,
} from "@anthropic-ai/claude-agent-sdk";

import { WALKTHROUGH_SYSTEM } from "./engine/index.js";

interface ModelAnswer {
  readonly costUsd: number;
  readonly text: string;
}

const DEFAULT_MODEL = "claude-sonnet-5-5";

const BUDGET_USD = 0.25;

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
  systemPrompt: WALKTHROUGH_SYSTEM,
  tools: [],
});

const toPrompt = (
  base64: string,
  text: string
): AsyncIterable<SDKUserMessage> => {
  const message: SDKUserMessage = {
    message: {
      content: [
        {
          source: { data: base64, media_type: "image/png", type: "base64" },
          type: "image",
        },
        { text, type: "text" },
      ],
      role: "user",
    },
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

const runWalkthroughModel = async (
  shotFile: string,
  text: string
): Promise<ModelAnswer> => {
  const [{ query }, bytes] = await Promise.all([
    import("@anthropic-ai/claude-agent-sdk"),
    readFile(shotFile),
  ]);

  const stream = query({
    options: toOptions(),
    prompt: toPrompt(bytes.toString("base64"), text),
  });

  try {
    return await toAnswer(stream);
  } finally {
    stream.close();
  }
};

export { runWalkthroughModel };

export type { ModelAnswer };
