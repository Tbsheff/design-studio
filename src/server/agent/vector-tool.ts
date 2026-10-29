import { z } from 'zod';
import type { InsertTarget } from '../../shared/insert.js';
import { BOOLEAN_OPS, VECTOR_COLOR, VECTOR_PATH_MAX, type VectorBox, type VectorRequest } from '../../shared/vector.js';
import { writeAtomic } from '../direct-edit/index.js';
import { planVector } from '../direct-edit/vector-ops.js';
import { describeElements } from '../mcp/element.js';
import { editPageUrl } from './run-target.js';
import { refusal, writeProblem, type DirectToolDeps } from './direct-tools.js';
import { targetOf } from './insert-tool.js';

type ToolText = { content: { type: 'text'; text: string }[]; isError?: boolean };

const color = z.string().trim().max(100).regex(VECTOR_COLOR);
const paint = {
  fill: color.nullable().optional().describe('Fill color, for example "#3b82f6" or "var(--primary)". null for no fill.'),
  stroke: color.nullable().optional().describe('Stroke color. null removes the stroke.'),
  strokeWidth: z.number().min(0).max(1000).nullable().optional().describe('Stroke width in px.'),
};
const where = {
  targetSelector: z.string().trim().min(1).max(2000).optional().describe('CSS selector of the element on the live page.'),
  targetSource: z.string().trim().max(1100).optional().describe('Or the element as file:line:col of its tag.'),
  path: z.string().trim().max(300).optional().describe('Page path. Leave out for the page of the frame in <canvas-context>.'),
};

export const VECTOR_DRAW_SHORT = 'Draw a rectangle, ellipse or pen path as an inline <svg> placed at x, y in a parent element (one undo step).';
export const VECTOR_BOOLEAN_SHORT = 'Union, subtract, intersect or exclude two SVG shapes into one <path>.';
export const VECTOR_PAINT_SHORT = 'Set fill, stroke or stroke width of an SVG shape.';

export const drawVectorShape = {
  ...where,
  shape: z.enum(['rect', 'ellipse', 'path']).describe('rect or ellipse: pass x, y, width, height. path: pass d.'),
  x: z.number().min(-100000).max(100000).default(0).describe('Left edge in px from the parent padding box.'),
  y: z.number().min(-100000).max(100000).default(0).describe('Top edge in px from the parent padding box.'),
  width: z.number().min(1).max(100000).optional(),
  height: z.number().min(1).max(100000).optional(),
  d: z.string().trim().min(1).max(VECTOR_PATH_MAX).optional().describe('SVG path data in px from the parent padding box. End with Z to close it.'),
  name: z.string().trim().min(1).max(60).optional(),
  makeParentRelative: z.boolean().default(false).describe('Also set position: relative on the parent.'),
  ...paint,
};

export const booleanShapesShape = {
  selectors: z.tuple([z.string().trim().min(1).max(2000), z.string().trim().min(1).max(2000)]).optional().describe('Two CSS selectors of SVG shapes. The first keeps its place and paint.'),
  sources: z.tuple([z.string().trim().max(1100), z.string().trim().max(1100)]).optional().describe('Or the two shapes as file:line:col.'),
  path: where.path,
  op: z.enum(BOOLEAN_OPS).describe('union, subtract (first minus second), intersect or exclude.'),
};

export const paintShapeShape = { ...where, ...paint };

const drawSchema = z.object(drawVectorShape).strict();
const booleanSchema = z.object(booleanShapesShape).strict();
const paintSchema = z.object(paintShapeShape).strict();

function text(message: string, isError = false): ToolText {
  return { content: [{ type: 'text', text: message }], ...(isError ? { isError: true } : {}) };
}

function issues(name: string, error: z.ZodError): ToolText {
  return text(`${name}: ${error.issues.map((issue) => `${issue.path.join('.') || 'input'}: ${issue.message}`).join('; ')}`, true);
}

function paintOf(input: { fill?: string | null | undefined; stroke?: string | null | undefined; strokeWidth?: number | null | undefined }) {
  return { ...(input.fill !== undefined ? { fill: input.fill === 'none' ? null : input.fill } : {}), ...(input.stroke !== undefined ? { stroke: input.stroke } : {}), ...(input.strokeWidth !== undefined ? { strokeWidth: input.strokeWidth } : {}) };
}

async function write(deps: DirectToolDeps, name: string, request: VectorRequest): Promise<ToolText> {
  const { project, direction, previewUrl } = deps.ctx;
  const previewOrigin = previewUrl && project.kind === 'react' ? new URL(previewUrl).origin : null;
  const plan = await planVector({ project, workTree: direction.workTree, previewOrigin }, request);
  const problem = writeProblem(deps.ctx, plan.target.relative);
  if (problem) return text(problem, true);
  await writeAtomic(plan.target.file, plan.code);
  const at = plan.select.map((item) => `${item.file}:${item.line}:${item.col}`).join(', ');
  return text(`${plan.title} at ${at}. The run saves this change in its version, like your file edits.`);
}

async function guarded(deps: DirectToolDeps, name: string, task: () => Promise<ToolText>): Promise<ToolText> {
  const blocked = refusal(deps.ctx, name);
  if (blocked) return text(blocked, true);
  try {
    return await task();
  } catch (error) {
    return text(`${name} failed: ${error instanceof Error ? error.message : String(error)}`, true);
  }
}

export function runDrawVector(deps: DirectToolDeps, args: z.input<typeof drawSchema>): Promise<ToolText> {
  return guarded(deps, 'draw_vector', async () => {
    const parsed = drawSchema.safeParse(args);
    if (!parsed.success) return issues('draw_vector', parsed.error);
    const input = parsed.data;
    if ((input.targetSelector === undefined) === (input.targetSource === undefined)) return text('Pass targetSelector or targetSource, not both.', true);
    if (input.shape === 'path' ? !input.d : input.width === undefined || input.height === undefined) return text('shape path needs d; rect and ellipse need width and height.', true);
    const target = await targetOf(deps, input);
    if (typeof target === 'string') return text(target, true);
    const common = { target, relativeParent: input.makeParentRelative, ...paintOf(input) };
    const request: VectorRequest =
      input.shape === 'path'
        ? { op: 'path', d: input.d ?? '', ...(input.name ? { name: input.name } : {}), ...common }
        : { op: 'shape', shape: input.shape, box: { x: input.x, y: input.y, width: input.width ?? 1, height: input.height ?? 1 }, ...common };
    return write(deps, 'draw_vector', request);
  });
}

async function rectsOf(deps: DirectToolDeps, page: string | undefined, selectors: [string, string]): Promise<[VectorBox, VectorBox] | undefined> {
  if (!deps.ctx.previewUrl) return undefined;
  const found = await describeElements(deps.preview, editPageUrl(deps.ctx, page), selectors).catch(() => []);
  const [a, b] = found;
  return a && b ? [a.rect, b.rect] : undefined;
}

export function runBooleanShapes(deps: DirectToolDeps, args: z.input<typeof booleanSchema>): Promise<ToolText> {
  return guarded(deps, 'boolean_shapes', async () => {
    const parsed = booleanSchema.safeParse(args);
    if (!parsed.success) return issues('boolean_shapes', parsed.error);
    const input = parsed.data;
    if ((input.selectors === undefined) === (input.sources === undefined)) return text('Pass selectors or sources, not both.', true);
    const targets: InsertTarget[] = [];
    for (const index of [0, 1] as const) {
      const found = await targetOf(deps, input.selectors ? { targetSelector: input.selectors[index], path: input.path } : { targetSource: input.sources?.[index], path: input.path });
      if (typeof found === 'string') return text(found, true);
      targets.push(found);
    }
    const rects = input.selectors ? await rectsOf(deps, input.path, input.selectors) : undefined;
    return write(deps, 'boolean_shapes', { op: 'boolean', boolean: input.op, targets: [targets[0] as InsertTarget, targets[1] as InsertTarget], ...(rects ? { rects } : {}) });
  });
}

export function runPaintShape(deps: DirectToolDeps, args: z.input<typeof paintSchema>): Promise<ToolText> {
  return guarded(deps, 'paint_shape', async () => {
    const parsed = paintSchema.safeParse(args);
    if (!parsed.success) return issues('paint_shape', parsed.error);
    const input = parsed.data;
    if ((input.targetSelector === undefined) === (input.targetSource === undefined)) return text('Pass targetSelector or targetSource, not both.', true);
    const target = await targetOf(deps, input);
    if (typeof target === 'string') return text(target, true);
    return write(deps, 'paint_shape', { op: 'paint', target, ...paintOf(input) });
  });
}
