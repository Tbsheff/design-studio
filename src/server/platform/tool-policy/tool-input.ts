import type { CanUseTool } from "@anthropic-ai/claude-agent-sdk";

type ToolInput = Parameters<CanUseTool>[1];

const isText = (value: unknown): value is string => typeof value === "string";

const isMissing = (value: unknown): value is null | undefined =>
  (value ?? null) === null;

export { isMissing, isText };

export type { ToolInput };
