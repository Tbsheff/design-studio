import { z } from 'zod';
import { MATCH_KINDS } from '../../shared/contracts.js';
import { canvasOwner, readCanvasAt } from '../canvas/service.js';
import { findFrame } from '../canvas/tools.js';
import { withPagePath } from '../export/source.js';
import { isLayerRef, LayerRefError, memoPage, scopeOf } from '../mcp/layer-ref.js';
import { MATCH_BY_TEXT, SELECT_MATCHING_TEXT, selectMatchingOnPage } from '../mcp/select-tools.js';
import type { DirectToolDeps } from './direct-tools.js';

type ToolText = { content: { type: 'text'; text: string }[]; isError?: boolean };

const DEFAULT_VIEWPORT = { width: 1440, height: 900 };

export const SELECT_MATCHING_DESCRIPTION = SELECT_MATCHING_TEXT;

export const selectMatchingShape = {
  frame: z.string().trim().min(1).max(60).optional().describe('Canvas frame id or @label; its page and size are used. Leave out for the entry page at 1440x900.'),
  path: z.string().trim().max(300).optional().describe('Page path instead of the frame page.'),
  selector: z.string().trim().min(1).max(2000).describe('The element to match: a layer id from get_layers or a CSS selector.'),
  by: z.enum(MATCH_KINDS).describe(MATCH_BY_TEXT),
};

const schema = z.object(selectMatchingShape).strict();

function text(message: string, isError = false): ToolText {
  return { content: [{ type: 'text', text: message }], ...(isError ? { isError: true } : {}) };
}

async function pageOf(deps: DirectToolDeps, input: z.output<typeof schema>): Promise<{ url: string; viewport: { width: number; height: number }; page: string | undefined }> {
  if (!deps.ctx.previewUrl) throw new Error('Preview is not running for this direction, so elements cannot be found.');
  const frames = input.frame ? ((await readCanvasAt(canvasOwner(deps.ctx.project).workTree)).canvas?.frames ?? []) : [];
  const frame = input.frame ? findFrame(frames, input.frame) : null;
  if (input.frame && !frame && input.frame !== 'f1') throw new Error(`No frame ${input.frame} on the canvas.`);
  const remembered = input.frame === undefined && input.path === undefined && isLayerRef(input.selector) ? memoPage(scopeOf(deps.ctx.project.id, deps.ctx.direction.id), input.selector.trim()) : undefined;
  const page = input.path || remembered || frame?.path || undefined;
  return { url: withPagePath(deps.ctx.previewUrl, page), viewport: frame ? { width: frame.width, height: frame.height } : DEFAULT_VIEWPORT, page };
}

export async function runSelectMatching(deps: DirectToolDeps, args: z.input<typeof schema>): Promise<ToolText> {
  const parsed = schema.safeParse(args);
  if (!parsed.success) return text(`select_matching: ${parsed.error.issues.map((issue) => `${issue.path.join('.') || 'input'}: ${issue.message}`).join('; ')}`, true);
  try {
    const target = await pageOf(deps, parsed.data);
    const report = await selectMatchingOnPage(deps.preview, { ...target, scope: scopeOf(deps.ctx.project.id, deps.ctx.direction.id), selector: parsed.data.selector, by: parsed.data.by });
    return text(JSON.stringify(report, null, 2));
  } catch (error) {
    return text(error instanceof LayerRefError ? error.message : `select_matching failed: ${error instanceof Error ? error.message : String(error)}`, true);
  }
}
