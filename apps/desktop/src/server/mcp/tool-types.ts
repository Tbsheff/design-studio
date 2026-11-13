interface ToolContent {
  type: "text" | "image";
  text?: string;
  data?: string;
  mimeType?: string;
}

interface ErrorTag {
  readonly _tag: string;
  readonly code: string | null;
  readonly message: string;
}

interface ToolResult {
  content: ToolContent[];
  isError?: boolean;
  structuredContent?: ErrorTag;
}

interface ToolDef {
  name: string;
  title: string;
  description: string;
  inputSchema: object;
  annotations: {
    readOnlyHint: boolean;
    destructiveHint?: boolean;
    idempotentHint?: boolean;
    openWorldHint: boolean;
  };
}

export type { ErrorTag, ToolContent, ToolDef, ToolResult };
