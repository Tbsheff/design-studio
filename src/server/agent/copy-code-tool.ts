import { z } from "zod";

import { COPY_CODE_FORMATS } from "../../shared/export.js";
import type { CopyCodeFormat, ExportFrame } from "../../shared/export.js";
import { COPY_FRAME, copyCode } from "../export/copy-handler.js";
import type { DirectToolDeps } from "./direct-tools.js";

interface ToolContent {
  text: string;
  type: "text";
}

interface ToolText {
  [key: string]: boolean | ToolContent[] | undefined;
  content: ToolContent[];
  isError?: boolean;
}

const SELECTOR_MAX = 2000;
const PATH_MAX = 300;

const COPY_CODE_AGENT_DESCRIPTION =
  "Read only. Copy one element as code with the same server code as Copy as code in the studio and the MCP copy_code tool: html (markup and a <style> block), tailwind (markup with Tailwind classes) or react (a JSX component named after the layer with className or style objects, and kit components such as <Button> with their import lines). Changes no file.";

const copyCodeInput = {
  format: z
    .enum(COPY_CODE_FORMATS as [CopyCodeFormat, ...CopyCodeFormat[]])
    .optional()
    .describe("html (default), tailwind or react."),
  path: z
    .string()
    .trim()
    .max(PATH_MAX)
    .optional()
    .describe("Page path. Leave out for the entry page."),
  targetSelector: z
    .string()
    .trim()
    .min(1)
    .max(SELECTOR_MAX)
    .describe("CSS selector or layer id of the element to copy."),
};

const schema = z.strictObject(copyCodeInput);

const reply = (text: string): ToolText => ({
  content: [{ text, type: "text" }],
});

const refuse = (text: string): ToolText => ({
  content: [{ text, type: "text" }],
  isError: true,
});

const frameFor = (path: string | undefined): ExportFrame => {
  if (!path) {
    return COPY_FRAME;
  }

  return { ...COPY_FRAME, path };
};

const messageOf = (error: Error | string | null): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
};

const copyWith = async (
  deps: DirectToolDeps,
  input: z.output<typeof schema>
): Promise<ToolText> => {
  const { direction, project } = deps.ctx;
  const format = input.format ?? "html";

  const url =
    deps.ctx.previewUrl ??
    (await deps.preview.directionUrl(project, direction));

  const code = await copyCode(
    deps.preview,
    { project, url, workTree: direction.workTree },
    { format, frame: frameFor(input.path), selector: input.targetSelector }
  );

  return reply(JSON.stringify({ code, format }));
};

const runCopyCode = async (
  deps: DirectToolDeps,
  args: z.input<typeof schema>
): Promise<ToolText> => {
  const parsed = schema.safeParse(args);

  if (!parsed.success) {
    const lines = parsed.error.issues.map(
      (issue) => `${issue.path.join(".") || "input"}: ${issue.message}`
    );

    return refuse(`copy_code: ${lines.join("; ")}`);
  }

  try {
    return await copyWith(deps, parsed.data);
  } catch (error) {
    return refuse(`copy_code failed: ${messageOf(error as Error | null)}`);
  }
};

export { COPY_CODE_AGENT_DESCRIPTION, copyCodeInput, runCopyCode };
