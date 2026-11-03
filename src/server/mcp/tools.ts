export interface ToolContent {
  type: "text" | "image";
  text?: string;
  data?: string;
  mimeType?: string;
}

export interface ToolResult {
  content: ToolContent[];
  isError?: boolean;
}

export interface ToolDef {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations: {
    readOnlyHint: boolean;
    destructiveHint?: boolean;
    idempotentHint?: boolean;
    openWorldHint: boolean;
  };
}

export class ToolError extends Error {}

export const TOOLS: ToolDef[] = [];

export function callTool(
  _deps: unknown,
  name: string,
  _args: Record<string, unknown>
): Promise<ToolResult> {
  return Promise.reject(new ToolError(`unknown tool ${name}`));
}
