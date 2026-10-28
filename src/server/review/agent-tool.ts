import { z } from 'zod';
import type { CanvasService } from '../canvas/service.js';
import { frameRef } from '../canvas/tools.js';
import type { AgentRunContext, PreviewService } from '../types.js';
import { resolveReviewFrame } from './frame.js';
import { runReview } from './run.js';

const VIEWPORTS = { desktop: { width: 1440, height: 900 }, tablet: { width: 768, height: 1024 }, mobile: { width: 390, height: 844 } } as const;

export const reviewFrameShape = {
  frame: frameRef.optional().describe('Frame id or @label from canvas_list. Leave out for the live frame or the first frame.'),
  path: z.string().trim().max(300).optional().describe('Page path instead of the frame page.'),
  viewport: z.enum(['desktop', 'tablet', 'mobile']).optional().describe('Render size instead of the frame size.'),
};

const schema = z.object(reviewFrameShape).strict();

interface ReviewToolDeps {
  preview: PreviewService;
  ctx: AgentRunContext;
  canvas?: CanvasService;
}

type ToolText = { content: { type: 'text'; text: string }[]; isError?: boolean };

export async function runReviewFrameTool(deps: ReviewToolDeps, args: z.input<typeof schema>): Promise<ToolText> {
  const parsed = schema.safeParse(args);
  if (!parsed.success) return { content: [{ type: 'text', text: `review_frame: ${parsed.error.issues.map((issue) => issue.message).join('; ')}` }], isError: true };
  const { project, direction, previewUrl } = deps.ctx;
  if (!previewUrl) return { content: [{ type: 'text', text: 'Preview is not running for this direction.' }], isError: true };
  try {
    const size = parsed.data.viewport ? VIEWPORTS[parsed.data.viewport] : null;
    const input = { ...(parsed.data.frame ? { frame: parsed.data.frame } : {}), ...(parsed.data.path ? { path: parsed.data.path } : {}), ...(size ?? {}) };
    const frame = deps.canvas ? await resolveReviewFrame(deps.canvas, project, direction, input) : { ...(input.path ? { path: input.path } : {}), width: size?.width ?? 1440, height: size?.height ?? 900 };
    const review = await runReview(deps.preview, { project, direction, frame, baseUrl: previewUrl });
    const findings = review.findings.map((f) => ({ kind: f.kind, severity: f.severity, element: f.element, selector: f.selector, source: f.source, message: f.message, directFix: f.fix ? { label: f.fix.label, style: f.fix.edit.style } : null }));
    const text = JSON.stringify({ frame: review.frame, counts: review.counts, findings, notes: [...review.notes, 'Fix findings with edit_element (directFix.style is the exact style) or with Edit for the ones that need judgment.'] }, null, 2);
    return { content: [{ type: 'text', text }] };
  } catch (error) {
    return { content: [{ type: 'text', text: `review_frame failed: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
  }
}
