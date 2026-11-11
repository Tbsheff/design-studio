import { buildUserText } from "../agent/index.js";
import type { RunDriver } from "../agent/index.js";
import { runAgentTool } from "../mcp/index.js";
import type { ServerConfig } from "../platform/config/index.js";
import type { StudioRuntime } from "./runtime.js";

type ToolResult = Awaited<ReturnType<typeof runAgentTool>>;

type DriverInput = Parameters<RunDriver>[0];

type DriverOutcome = Awaited<ReturnType<RunDriver>>;

const PROTOTYPE_TOOL = "create_prototype_project";
const PROTOTYPE_TOOL_NAME = `mcp__studio__${PROTOTYPE_TOOL}`;
const PROTOTYPE_REQUEST = /\bhtml prototype\b/iu;
const MOCK_CONTEXT_TOKENS = 24_000;
const SUMMARY_CHARS = 200;

const DONE_TEXT =
  "Made a linked HTML prototype in the Design Studio folder with the app tokens. The app repo did not change.";

const MOCK_USAGE = {
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
  inputTokens: 120,
  outputTokens: 80,
};

const isMockPrototype = (input: DriverInput): boolean =>
  Boolean(input.ctx.project.app) &&
  input.ctx.request.mode === "edit" &&
  PROTOTYPE_REQUEST.test(input.ctx.request.prompt);

const toResultText = (result: ToolResult): string => {
  const [first] = result.content;

  if (first?.type === "text") {
    return first.text;
  }

  return "";
};

const toReply = (result: ToolResult): string => {
  if (result.isError) {
    return `The prototype was not made: ${toResultText(result)}`;
  }

  return DONE_TEXT;
};

const runMockPrototype = async (
  input: DriverInput,
  runtime: StudioRuntime
): Promise<DriverOutcome> => {
  const startedAt = Date.now();
  const { ctx, runId, sink } = input;

  await sink.sessionStarted(
    ctx.direction.sessionId ?? `mock-${ctx.direction.id}-${runId}`
  );
  sink.usage(MOCK_CONTEXT_TOKENS);
  sink.sent({
    imageCount: 0,
    promptHash: "mock",
    recommendedSkills: [],
    resume: ctx.direction.sessionId,
    text: buildUserText(ctx),
    updatedInstructions: false,
  });

  const args = { projectId: ctx.project.id, prompt: ctx.request.prompt };
  const toolUseId = `mock_prototype_${runId}`;
  sink.toolStarted(toolUseId, PROTOTYPE_TOOL_NAME, args);
  const result = await runAgentTool(runtime, PROTOTYPE_TOOL, { args });
  const text = toResultText(result);
  sink.toolFinished(
    toolUseId,
    result.isError,
    text.slice(0, SUMMARY_CHARS),
    text
  );
  const reply = toReply(result);
  sink.text(reply);

  const outcome: DriverOutcome = {
    costUsd: 0,
    durationMs: Date.now() - startedAt,
    error: null,
    finalText: reply,
    modelMs: 0,
    status: "completed",
    usage: { ...MOCK_USAGE },
  };

  return outcome;
};

const toMockPrototypeDriver = (
  driver: RunDriver,
  runtime: StudioRuntime,
  mode: ServerConfig["agentMode"]
): RunDriver => {
  if (mode !== "mock") {
    return driver;
  }

  return (input) => {
    if (!isMockPrototype(input)) {
      return driver(input);
    }

    return runMockPrototype(input, runtime);
  };
};

export { toMockPrototypeDriver };
