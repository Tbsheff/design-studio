import { readFile } from "node:fs/promises";

import {
  COMPARE_TO_REFERENCE_TEXT,
  plainAttachmentName,
} from "../../shared/reference.js";
import type {
  AgentRunContext,
  PreviewService,
} from "../../shared/server-ports.js";
import {
  toOptionalText,
  toSdkFieldSet,
  toToolInput,
} from "../agent-tools/index.js";
import { scoreOutput } from "../mcp/reference-tools.js";
import { compareToReference, referenceAttachment } from "./reference-check.js";
import { resolveShotTarget } from "./run-target.js";
import type { TargetDeps } from "./run-target.js";

type ToolResult = Readonly<{
  content: (
    | { type: "text"; text: string }
    | { type: "image"; data: string; mimeType: string }
  )[];
  isError?: boolean;
}>;

const compareReferenceFields = {
  attachment: toOptionalText(
    1,
    300,
    "Name of an attached image to compare with. Leave out for the image the user marked as the reference."
  ),
  frame: toOptionalText(
    1,
    80,
    "Frame id or @label from canvas_list. Leave out for the frame of this run."
  ),
  path: toOptionalText(0, 500, "Page path instead of the frame page."),
};

export const compareReferenceSdkFields = toSdkFieldSet(compareReferenceFields);

const compareReferenceInput = toToolInput(compareReferenceFields);

export const COMPARE_REFERENCE_DESCRIPTION = `${COMPARE_TO_REFERENCE_TEXT.replace("Compare a canvas frame with a reference picture", "Compare a canvas frame with the reference picture the user attached")} Returns the diff sheet as an image too. Use it after you rebuild a screenshot or mock, and again after each fix.`;

export interface ReferenceToolDeps {
  preview: PreviewService;
  ctx: AgentRunContext;
  runsDir: string;
  runId: string;
  targets: TargetDeps | null;
}

function failed(message: string): ToolResult {
  return {
    content: [{ text: `compare_to_reference: ${message}`, type: "text" }],
    isError: true,
  };
}

function pickAttachment(ctx: AgentRunContext, name: string | undefined) {
  if (!name) {
    return (
      referenceAttachment(ctx.attachments) ??
      ctx.attachments.find((item) => item.mime.startsWith("image/")) ??
      null
    );
  }

  return (
    ctx.attachments.find(
      (item) => item.name === name || plainAttachmentName(item.name) === name
    ) ?? null
  );
}

let calls = 0;

export async function runCompareToReference(
  deps: ReferenceToolDeps,
  args: {
    attachment?: string | undefined;
    frame?: string | undefined;
    path?: string | undefined;
  }
): Promise<ToolResult> {
  const parsed = compareReferenceInput.safeParse(args);

  if (!parsed.success) {
    return failed(parsed.error);
  }

  const attachment = pickAttachment(deps.ctx, parsed.data.attachment);

  if (!attachment) {
    return failed(
      parsed.data.attachment
        ? `no attached image named ${parsed.data.attachment}.`
        : "this run has no attached image."
    );
  }

  try {
    const shot = await resolveShotTarget(deps.targets, deps.ctx, {
      ...(parsed.data.frame ? { frame: parsed.data.frame } : {}),
      ...(parsed.data.path === undefined ? {} : { path: parsed.data.path }),
    });

    if (!shot) {
      return failed("the preview is not running for this direction.");
    }

    calls += 1;

    const score = await compareToReference({
      preview: deps.preview,
      url: shot.url,
      file: attachment.path,
      mime: attachment.mime,
      ...(shot.size === null ? {} : { frameWidth: shot.size.width }),
      outDir: deps.runsDir,
      stem: `${deps.runId}-compare-${calls}`,
    });

    const sheet = (await readFile(score.diffPath)).toString("base64");

    return {
      content: [
        { data: sheet, mimeType: "image/png", type: "image" },
        {
          text: JSON.stringify(
            {
              reference: plainAttachmentName(attachment.name),
              frame: shot.label,
              ...scoreOutput(score),
            },
            null,
            2
          ),
          type: "text",
        },
      ],
    };
  } catch (error) {
    return failed(error instanceof Error ? error.message : String(error));
  }
}
