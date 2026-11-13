import type { Attachment } from "@design-studio/contracts";

import { buildUserText } from "../agent/index.js";
import type { RunDriver } from "../agent/index.js";
import { runAgentTool } from "../mcp/index.js";
import type { ServerConfig } from "../platform/config/index.js";
import type { StudioRuntime } from "./runtime.js";

type ToolResult = Awaited<ReturnType<typeof runAgentTool>>;

type DriverInput = Parameters<RunDriver>[0];

type DriverOutcome = Awaited<ReturnType<RunDriver>>;

const IMPORT_TOOL = "import_frame_canvas";
const IMPORT_TOOL_NAME = `mcp__studio__${IMPORT_TOOL}`;
const IMPORT_REQUEST = /\bnew (?:screen|page)\b/iu;
const MOCK_CONTEXT_TOKENS = 24_000;
const SUMMARY_CHARS = 200;

const IMPORT_MIMES: ReadonlySet<string> = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const MOCK_USAGE = {
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
  inputTokens: 120,
  outputTokens: 80,
};

const toImportImage = (input: DriverInput): Attachment | null =>
  input.ctx.attachments.find((attachment) =>
    IMPORT_MIMES.has(attachment.mime)
  ) ?? null;

const isHtmlProject = (input: DriverInput): boolean =>
  !input.ctx.project.app && input.ctx.project.kind === "html";

const isMockImport = (input: DriverInput): boolean =>
  isHtmlProject(input) &&
  input.ctx.request.mode === "edit" &&
  IMPORT_REQUEST.test(input.ctx.request.prompt);

const toResultText = (result: ToolResult): string => {
  const [first] = result.content;

  if (first?.type === "text") {
    return first.text;
  }

  return "";
};

const toReply = (result: ToolResult, attachment: Attachment): string => {
  if (result.isError) {
    return `The screen was not added: ${toResultText(result)}`;
  }

  return `Added a new screen and frame from image ${attachment.id} (${attachment.name}). The frame takes the image shape.`;
};

interface ImportArgs {
  readonly attachmentId: string;
  readonly directionId: string;
  readonly name: null;
  readonly projectId: string;
  readonly prompt: null;
  readonly shouldStartRun: false;
  readonly x: null;
  readonly y: null;
}

const toImportArgs = (
  input: DriverInput,
  attachment: Attachment
): ImportArgs => ({
  attachmentId: attachment.id,
  directionId: input.ctx.direction.id,
  name: null,
  projectId: input.ctx.project.id,
  prompt: null,
  shouldStartRun: false,
  x: null,
  y: null,
});

const runMockImport = async (
  input: DriverInput,
  runtime: StudioRuntime,
  attachment: Attachment
): Promise<DriverOutcome> => {
  const startedAt = Date.now();
  const { ctx, runId, sink } = input;

  await sink.sessionStarted(
    ctx.direction.sessionId ?? `mock-${ctx.direction.id}-${runId}`
  );
  sink.usage(MOCK_CONTEXT_TOKENS);
  sink.sent({
    imageCount: ctx.attachments.length,
    promptHash: "mock",
    recommendedSkills: [],
    resume: ctx.direction.sessionId,
    text: buildUserText(ctx),
    updatedInstructions: false,
  });

  const args = toImportArgs(input, attachment);
  const toolUseId = `mock_import_${runId}`;
  sink.toolStarted(toolUseId, IMPORT_TOOL_NAME, args);

  const result = await runAgentTool(runtime, IMPORT_TOOL, {
    args: { ...args },
  });

  const text = toResultText(result);

  sink.toolFinished(
    toolUseId,
    result.isError,
    text.slice(0, SUMMARY_CHARS),
    text
  );
  const reply = toReply(result, attachment);
  sink.text(reply);

  return {
    costUsd: 0,
    durationMs: Date.now() - startedAt,
    error: null,
    finalText: reply,
    modelMs: 0,
    status: "completed",
    usage: { ...MOCK_USAGE },
  };
};

const toMockImportDriver = (
  driver: RunDriver,
  runtime: StudioRuntime,
  mode: ServerConfig["agentMode"]
): RunDriver => {
  if (mode !== "mock") {
    return driver;
  }

  return (input) => {
    const attachment = toImportImage(input);

    if (attachment === null || !isMockImport(input)) {
      return driver(input);
    }

    return runMockImport(input, runtime, attachment);
  };
};

export { toMockImportDriver };
