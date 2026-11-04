import { Schema } from "effect";

import { MATCH_KINDS } from "../../shared/contracts.js";
import { toSdkFieldSet } from "../agent-tools/sdk-shape.js";
import { canvasOwner, readCanvasAt } from "../canvas/service.js";
import { findFrame } from "../canvas/tools.js";
import { withPagePath } from "../export/source.js";
import {
  MATCH_BY_TEXT,
  SELECT_MATCHING_TEXT,
  selectMatchingOnPage,
} from "../mcp/select-tools.js";
import {
  isLayerRef,
  LayerRefError,
  memoPage,
  scopeOf,
} from "../page-probe/layer-ref.js";
import type { DirectToolDeps } from "./direct-tools.js";
import { toOptionalText, toToolInput, toTrimmedText } from "./tool-input.js";
import type { ToolArgs, ToolData } from "./tool-input.js";

type ToolText = Readonly<{
  content: { type: "text"; text: string }[];
  isError?: boolean;
}>;

const DEFAULT_VIEWPORT = { height: 900, width: 1440 };

export const SELECT_MATCHING_DESCRIPTION = SELECT_MATCHING_TEXT;

const selectMatchingFields = {
  by: Schema.Literals(MATCH_KINDS).annotate({ description: MATCH_BY_TEXT }),
  frame: toOptionalText(
    1,
    60,
    "Canvas frame id or @label; its page and size are used. Leave out for the entry page at 1440x900."
  ),
  path: toOptionalText(0, 300, "Page path instead of the frame page."),
  selector: toTrimmedText(1, 2000).annotate({
    description:
      "The element to match: a layer id from get_layers or a CSS selector.",
  }),
};

export const selectMatchingShape = toSdkFieldSet(selectMatchingFields);

const schema = toToolInput(selectMatchingFields);

function text(message: string, isError = false): ToolText {
  return {
    content: [{ text: message, type: "text" }],
    ...(isError ? { isError: true } : {}),
  };
}

async function pageOf(
  deps: DirectToolDeps,
  input: ToolData<typeof schema>
): Promise<{
  url: string;
  viewport: { width: number; height: number };
  page: string | undefined;
}> {
  if (!deps.ctx.previewUrl) {
    throw new Error(
      "Preview is not running for this direction, so elements cannot be found."
    );
  }

  const frames = input.frame
    ? ((await readCanvasAt(canvasOwner(deps.ctx.project).workTree)).canvas
        ?.frames ?? [])
    : [];

  const frame = input.frame ? findFrame(frames, input.frame) : null;

  if (input.frame && !frame && input.frame !== "f1") {
    throw new Error(`No frame ${input.frame} on the canvas.`);
  }

  const remembered =
    input.frame === undefined &&
    input.path === undefined &&
    isLayerRef(input.selector)
      ? memoPage(
          scopeOf(deps.ctx.project.id, deps.ctx.direction.id),
          input.selector.trim()
        )
      : undefined;

  const page = input.path || remembered || frame?.path || undefined;

  return {
    page,
    url: withPagePath(deps.ctx.previewUrl, page),
    viewport: frame
      ? { width: frame.width, height: frame.height }
      : DEFAULT_VIEWPORT,
  };
}

export async function runSelectMatching(
  deps: DirectToolDeps,
  args: ToolArgs<typeof schema>
): Promise<ToolText> {
  const parsed = schema.safeParse(args);

  if (!parsed.success) {
    return text(`select_matching: ${parsed.error}`, true);
  }

  try {
    const target = await pageOf(deps, parsed.data);

    const report = await selectMatchingOnPage(deps.preview, {
      ...target,
      by: parsed.data.by,
      scope: scopeOf(deps.ctx.project.id, deps.ctx.direction.id),
      selector: parsed.data.selector,
    });

    return text(JSON.stringify(report, null, 2));
  } catch (error) {
    return text(
      error instanceof LayerRefError
        ? error.message
        : `select_matching failed: ${error instanceof Error ? error.message : String(error)}`,
      true
    );
  }
}
