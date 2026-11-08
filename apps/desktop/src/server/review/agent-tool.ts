import {
  DEFAULT_FRAME_STATE,
  withFrameStateHost,
} from "@design-studio/contracts/frame-state";
import type { ReviewFrame } from "@design-studio/contracts/review";
import { Schema } from "effect";

import type { RunTarget } from "../../shared/run-target.js";
import type {
  AgentRunContext,
  PreviewService,
} from "../../shared/server-ports.js";
import {
  toOptional,
  toOptionalText,
  toSdkFieldSet,
  toToolInput,
  toTrimmedText,
} from "../agent-tools/index.js";
import type { ToolArgs, ToolDecoded } from "../agent-tools/index.js";
import type { CanvasService } from "../canvas/index.js";
import { resolveReviewFrame } from "./frame.js";
import { runReview } from "./run.js";

const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 390, height: 844 },
} as const;

const FRAME_REF_MAX = 60;

const PATH_MAX = 300;

const SELECTOR_MAX = 2000;

const reviewFrameFields = {
  frame: toOptional(
    toTrimmedText(1, FRAME_REF_MAX),
    "Frame id or @label from canvas_list. Leave out for the frame from <canvas-context>, else the live frame or the first frame."
  ),
  path: toOptionalText(0, PATH_MAX, "Page path instead of the frame page."),
  selector: toOptional(
    toTrimmedText(1, SELECTOR_MAX),
    "CSS selector of one element. Only findings inside its subtree are returned."
  ),
  viewport: toOptional(
    Schema.Literals(["desktop", "tablet", "mobile"]),
    "Render size instead of the frame size."
  ),
};

const reviewFrameShape = toSdkFieldSet(reviewFrameFields);

const schema = toToolInput(reviewFrameFields);

interface ReviewToolDeps {
  preview: PreviewService;
  ctx: AgentRunContext;
  canvas?: CanvasService;
}

type ToolText = {
  content: { type: "text"; text: string }[];
  isError?: boolean;
};

function contextTarget(
  ctx: AgentRunContext,
  input: { frame?: string | undefined }
): RunTarget | null {
  const target = ctx.target ?? null;
  if (!target) return null;
  if (!input.frame) return target;
  const ref = input.frame.replace(/^@/, "").toLowerCase();
  return input.frame === target.id || ref === target.label?.toLowerCase()
    ? target
    : null;
}

function targetFrame(
  target: RunTarget,
  input: { path?: string; selector?: string; width?: number; height?: number }
): ReviewFrame {
  const path = input.path ?? target.path;
  return {
    id: target.id,
    ...(target.label ? { label: target.label } : {}),
    ...(path ? { path } : {}),
    ...(input.selector ? { selector: input.selector } : {}),
    width: input.width ?? target.width,
    height: input.height ?? target.height,
  };
}

async function reviewFrameOf(
  deps: ReviewToolDeps,
  data: ToolDecoded<typeof schema>,
  target: RunTarget | null
): Promise<ReviewFrame> {
  const size = data.viewport ? VIEWPORTS[data.viewport] : null;
  const frameRefOf = data.frame ?? target?.id;
  const input = {
    ...(frameRefOf ? { frame: frameRefOf } : {}),
    ...(data.path ? { path: data.path } : {}),
    ...(data.selector ? { selector: data.selector } : {}),
    ...size,
  };
  if (!deps.canvas)
    return {
      ...(input.path ? { path: input.path } : {}),
      ...(input.selector ? { selector: input.selector } : {}),
      width: size?.width ?? 1440,
      height: size?.height ?? 900,
    };
  try {
    return await resolveReviewFrame(
      deps.canvas,
      deps.ctx.project,
      deps.ctx.direction,
      input
    );
  } catch (error) {
    if (target) return targetFrame(target, input);
    throw error;
  }
}

async function runReviewFrameTool(
  deps: ReviewToolDeps,
  args: ToolArgs<typeof schema>
): Promise<ToolText> {
  const parsed = schema.safeParse(args);
  if (!parsed.success)
    return {
      content: [
        {
          type: "text",
          text: `review_frame: ${parsed.error}`,
        },
      ],
      isError: true,
    };
  const { project, direction, previewUrl } = deps.ctx;
  if (!previewUrl)
    return {
      content: [
        { type: "text", text: "Preview is not running for this direction." },
      ],
      isError: true,
    };
  try {
    const target = contextTarget(deps.ctx, parsed.data);
    const frame = await reviewFrameOf(deps, parsed.data, target);
    const state =
      target && (frame.id === undefined || frame.id === target.id)
        ? target.state
        : DEFAULT_FRAME_STATE;
    const review = await runReview(deps.preview, {
      project,
      direction,
      frame,
      baseUrl: withFrameStateHost(previewUrl, state),
      rules: deps.ctx.designRules ?? [],
    });
    const findings = review.findings.map((f) => ({
      kind: f.kind,
      severity: f.severity,
      element: f.element,
      selector: f.selector,
      source: f.source,
      message: f.message,
      ...(f.copies ? { copies: f.copies } : {}),
      ...(f.rule ? { rule: f.rule.text } : {}),
      directFix: f.fix ? { label: f.fix.label, style: f.fix.edit.style } : null,
    }));
    const text = JSON.stringify(
      {
        frame: review.frame,
        ...(review.matched ? { matched: review.matched } : {}),
        counts: review.counts,
        findings,
        notes: [
          ...review.notes,
          "Fix findings with edit_element (directFix.style is the exact style) or with Edit for the ones that need judgment.",
        ],
      },
      null,
      2
    );
    return { content: [{ type: "text", text }] };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `review_frame failed: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

export { reviewFrameShape, runReviewFrameTool };
