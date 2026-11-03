import { z } from "zod";

import {
  componentPreviewsFor,
  PreviewTargetError,
} from "../components/preview.js";
import type { DirectToolDeps } from "./direct-tools.js";

type ToolContent =
  | { type: "text"; text: string }
  | { type: "image"; data: string; mimeType: string };

export const componentPreviewShape = {
  file: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .describe(
      "File of the component, relative to the project, when two components have the same name."
    ),
  name: z
    .string()
    .regex(/^[A-Z][A-Za-z0-9_$]{0,63}$/)
    .describe('Component name from list_components, for example "Button".'),
};

const schema = z.object(componentPreviewShape).strict();

function text(
  message: string,
  isError = false
): { content: ToolContent[]; isError?: boolean } {
  return {
    content: [{ text: message, type: "text" }],
    ...(isError ? { isError: true } : {}),
  };
}

export async function runComponentPreview(
  deps: DirectToolDeps,
  args: z.input<typeof schema>
): Promise<{ content: ToolContent[]; isError?: boolean }> {
  const parsed = schema.safeParse(args);

  if (!parsed.success) {
    return text(
      `component_preview: ${parsed.error.issues.map((issue) => `${issue.path.join(".") || "input"}: ${issue.message}`).join("; ")}`,
      true
    );
  }

  const { project, direction } = deps.ctx;

  try {
    const result = await componentPreviewsFor(deps.preview).render(
      project,
      direction,
      { file: parsed.data.file, name: parsed.data.name }
    );

    if (!result.ok) {
      return text(result.reason, true);
    }

    return {
      content: [
        {
          data: result.png.toString("base64"),
          mimeType: "image/png",
          type: "image",
        },
        {
          text: JSON.stringify({
            component: result.component,
            props: result.props,
            text: result.text,
          }),
          type: "text",
        },
      ],
    };
  } catch (error) {
    return text(
      error instanceof PreviewTargetError
        ? error.message
        : `component_preview failed: ${error instanceof Error ? error.message : String(error)}`,
      true
    );
  }
}
