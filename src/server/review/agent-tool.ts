import { z } from 'zod';
import type { CanvasService } from '../canvas/service.js';
import { frameRef } from '../canvas/tools.js';
import type { AgentRunContext, PreviewService } from '../types.js';
import type { RunTarget } from '../agent/run-target.js';
import type { ReviewFrame } from '../../shared/review.js';
import { DEFAULT_FRAME_STATE, withFrameStateHost } from '../../shared/frame-state.js';
import { resolveReviewFrame } from './frame.js';
import { runReview } from './run.js';

const VIEWPORTS = { desktop: { width: 1440, height: 900 }, tablet: { width: 768, height: 1024 }, mobile: { width: 390, height: 844 } } as const;

export const reviewFrameShape = {
  frame: frameRef.optional().describe('Frame id or @label from canvas_list. Leave out for the frame from <canvas-context>, else the live frame or the first frame.'),
  path: z.string().trim().max(300).optional().describe('Page path instead of the frame page.'),
  viewport: z.enum(['desktop', 'tablet', 'mobile']).optional().describe('Render size instead of the frame size.'),
  selector: z.string().trim().min(1).max(2000).optional().describe('CSS selector of one element. Only findings inside its subtree are returned.'),
};

const schema = z.object(reviewFrameShape).strict();

interface ReviewToolDeps {
  preview: PreviewService;
  ctx: AgentRunContext;
  canvas?: CanvasService;
}

type ToolText = { content: { type: 'text'; text: string }[]; isError?: boolean };

function contextTarget(ctx: AgentRunContext, input: { frame?: string | undefined }): RunTarget | null {
  const target = ctx.target ?? null;
  if (!target) return null;
  if (!input.frame) return target;
  const ref = input.frame.replace(/^@/, '').toLowerCase();
  return input.frame === target.id || ref === target.label?.toLowerCase() ? target : null;
}

function targetFrame(target: RunTarget, input: { path?: string; selector?: string; width?: number; height?: number }): ReviewFrame {
  const path = input.path ?? target.path;
  return { id: target.id, ...(target.label ? { label: target.label } : {}), ...(path ? { path } : {}), ...(input.selector ? { selector: input.selector } : {}), width: input.width ?? target.width, height: input.height ?? target.height };
}

async function reviewFrameOf(deps: ReviewToolDeps, data: z.output<typeof schema>, target: RunTarget | null): Promise<ReviewFrame> {
  const size = data.viewport ? VIEWPORTS[data.viewport] : null;
  const frameRefOf = data.frame ?? target?.id;
  const input = { ...(frameRefOf ? { frame: frameRefOf } : {}), ...(data.path ? { path: data.path } : {}), ...(data.selector ? { selector: data.selector } : {}), ...(size ?? {}) };
  if (!deps.canvas) return { ...(input.path ? { path: input.path } : {}), ...(input.selector ? { selector: input.selector } : {}), width: size?.width ?? 1440, height: size?.height ?? 900 };
  try {
    return await resolveReviewFrame(deps.canvas, deps.ctx.project, deps.ctx.direction, input);
  } catch (error) {
    if (target) return targetFrame(target, input);
    throw error;
  }
}

export async function runReviewFrameTool(deps: ReviewToolDeps, args: z.input<typeof schema>): Promise<ToolText> {
  const parsed = schema.safeParse(args);
  if (!parsed.success) return { content: [{ type: 'text', text: `review_frame: ${parsed.error.issues.map((issue) => issue.message).join('; ')}` }], isError: true };
  const { project, direction, previewUrl } = deps.ctx;
  if (!previewUrl) return { content: [{ type: 'text', text: 'Preview is not running for this direction.' }], isError: true };
  try {
    const target = contextTarget(deps.ctx, parsed.data);
    const frame = await reviewFrameOf(deps, parsed.data, target);
    const state = target && (frame.id === undefined || frame.id === target.id) ? target.state : DEFAULT_FRAME_STATE;
    const review = await runReview(deps.preview, { project, direction, frame, baseUrl: withFrameStateHost(previewUrl, state) });
    const findings = review.findings.map((f) => ({ kind: f.kind, severity: f.severity, element: f.element, selector: f.selector, source: f.source, message: f.message, ...(f.copies ? { copies: f.copies } : {}), directFix: f.fix ? { label: f.fix.label, style: f.fix.edit.style } : null }));
    const text = JSON.stringify({ frame: review.frame, counts: review.counts, findings, notes: [...review.notes, 'Fix findings with edit_element (directFix.style is the exact style) or with Edit for the ones that need judgment.'] }, null, 2);
    return { content: [{ type: 'text', text }] };
  } catch (error) {
    return { content: [{ type: 'text', text: `review_frame failed: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
  }
}
