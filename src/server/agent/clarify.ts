import os from "node:os";

import type {
  Options,
  SDKMessage,
  query,
} from "@anthropic-ai/claude-agent-sdk";
import { Schema } from "effect";

import { needsQuestions } from "../../shared/clarify.js";
import type { ClarifyQuestion } from "../../shared/contracts.js";
import { extractJson } from "../../shared/extract-json.js";
import { WIREFRAME_MODEL } from "../../shared/run-levels.js";
import { toTrimmedText } from "../agent-tools/index.js";
import { toDecoder } from "../platform/decode/index.js";

type QueryFn = typeof query;

export const MAX_QUESTIONS = 3;
const CLARIFY_TIMEOUT_MS = 12_000;

const QuestionSchema = Schema.Struct({
  options: Schema.Array(toTrimmedText(1, 60)).check(
    Schema.isMinLength(2),
    Schema.isMaxLength(4)
  ),
  question: toTrimmedText(3, 160),
});

const decodeQuestionList = toDecoder(Schema.Array(QuestionSchema), "ignore");

const decodeQuestionWrapper = toDecoder(
  Schema.Struct({ questions: Schema.Array(QuestionSchema) }),
  "ignore"
);

const CLARIFY_SYSTEM = `You help a designer start a design from a short brief. Before the build starts, ask the few questions whose answers change the design the most: audience, the one main action, content or sections, visual tone, data to show. Never ask about things the brief already says. Never ask about tech stack, budget or deadlines.
Answer with JSON only: an array of at most 3 items, each {"question": "short question", "options": ["2 to 4 short likely answers"]}. Questions under 12 words, options under 5 words, sentence case, no numbering.`;

export function toQuestions(
  raw: readonly { question: string; options: readonly string[] }[]
): ClarifyQuestion[] {
  return raw.slice(0, MAX_QUESTIONS).map((item, index) => ({
    id: `q${index + 1}`,
    options: [...new Set(item.options)],
    question: item.question,
  }));
}

export function parseClarifyReply(text: string): ClarifyQuestion[] {
  const json = extractJson(text);
  const list = decodeQuestionList(json);

  if (list._tag === "Success") {
    return toQuestions(list.success);
  }

  const wrapped = decodeQuestionWrapper(json);

  if (wrapped._tag === "Failure") {
    throw new Error("The clarify reply is not valid.");
  }

  return toQuestions(wrapped.success.questions);
}

export function fallbackQuestions(): ClarifyQuestion[] {
  return toQuestions([
    {
      options: ["New customers", "Existing users", "Internal team"],
      question: "Who is it for?",
    },
    {
      options: ["Sign up", "Buy", "Contact us", "Read more"],
      question: "What is the one main action?",
    },
    {
      options: [
        "Calm and minimal",
        "Bold and bright",
        "Warm and friendly",
        "Technical",
      ],
      question: "What tone should it have?",
    },
  ]);
}

function clarifyOptions(
  env?: Record<string, string | undefined>,
  claudeExecutable?: string
): Options {
  return {
    ...(env ? { env } : {}),
    ...(claudeExecutable
      ? { pathToClaudeCodeExecutable: claudeExecutable }
      : {}),
    cwd: os.tmpdir(),
    maxTurns: 1,
    mcpServers: {},
    model: WIREFRAME_MODEL,
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
    systemPrompt: CLARIFY_SYSTEM,
    tools: [],
  };
}

async function replyText(stream: AsyncIterable<SDKMessage>): Promise<string> {
  let text = "";

  for await (const message of stream) {
    if (message.type === "assistant") {
      for (const block of message.message.content) {
        if (block.type === "text") {
          text += block.text;
        }
      }
    } else if (
      message.type === "result" &&
      message.subtype === "success" &&
      message.result
    ) {
      text = message.result;
    }
  }

  return text;
}

export interface ClarifyDeps {
  mode: "mock" | "sdk";
  loadQuery?: () => Promise<QueryFn>;
  env?: Record<string, string | undefined>;
  claudeExecutable?: string;
  timeoutMs?: number;
}

export async function askQuestions(
  prompt: string,
  deps: ClarifyDeps
): Promise<{
  questions: ClarifyQuestion[];
  source: "mock" | "model" | "fallback" | "none";
}> {
  if (!needsQuestions(prompt)) {
    return { questions: [], source: "none" };
  }

  if (deps.mode === "mock") {
    return { questions: fallbackQuestions(), source: "mock" };
  }

  const loadQuery =
    deps.loadQuery ??
    (async () => (await import("@anthropic-ai/claude-agent-sdk")).query);

  const queryFn = await loadQuery();

  const stream = queryFn({
    options: clarifyOptions(deps.env, deps.claudeExecutable),
    prompt: `<brief>\n${prompt.trim()}\n</brief>\nReply with the JSON array only.`,
  });

  let timer: NodeJS.Timeout | undefined;

  try {
    const timeout = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(
        () => reject(new Error("clarify timed out")),
        deps.timeoutMs ?? CLARIFY_TIMEOUT_MS
      );
    });

    const questions = parseClarifyReply(
      await Promise.race([replyText(stream), timeout])
    );

    return questions.length > 0
      ? { questions, source: "model" }
      : { questions: fallbackQuestions(), source: "fallback" };
  } catch (error) {
    console.error(
      "[clarify] model questions failed, using fixed questions",
      error
    );

    return { questions: fallbackQuestions(), source: "fallback" };
  } finally {
    if (timer) {
      clearTimeout(timer);
    }

    stream.close();
  }
}
