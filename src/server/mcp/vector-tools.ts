import { z } from 'zod';
import type { Project } from '../../shared/contracts.js';
import { BOOLEAN_OPS, VECTOR_COLOR, VECTOR_PATH_MAX, type VectorBox, type VectorRequest, type VectorResult } from '../../shared/vector.js';
import { EditError, loadTarget, refuseWhileRunning, studioCall, type EditDeps } from './edit-deps.js';
import { base, defineTool, directionId, ok, pagePath, pageUrl, projectId, selector, versionActivity, type Done } from './edit-kit.js';
import { describeElements } from './element.js';
import { targetOf } from './insert-tools.js';

type Direction = Project['directions'][number];

const color = z.string().trim().max(100).regex(VECTOR_COLOR);
const targetSelector = selector.optional().describe('CSS selector or layer id of the element, for example "main" or "[data-name=\'Hero\']".');
const targetSource = z.string().trim().max(1100).optional().describe('Or the element as file:line:col of its tag, as get_layers prints it.');
const paint = {
  fill: color.nullable().optional().describe('Fill color, for example "#3b82f6" or "var(--primary)". null or "none" for no fill.'),
  stroke: color.nullable().optional().describe('Stroke color. null removes the stroke.'),
  strokeWidth: z.number().min(0).max(1000).nullable().optional().describe('Stroke width in px.'),
};
const oneTarget = (input: { targetSelector?: string | undefined; targetSource?: string | undefined }) => (input.targetSelector === undefined) !== (input.targetSource === undefined);

const drawSchema = z
  .object({
    projectId,
    directionId,
    path: pagePath,
    targetSelector: targetSelector.describe('CSS selector or layer id of the parent element to draw into, for example "main" or "body".'),
    targetSource,
    shape: z.enum(['rect', 'ellipse', 'path']).describe('rect or ellipse: pass x, y, width, height. path: pass d.'),
    x: z.number().min(-100000).max(100000).default(0).describe('Left edge in px from the parent padding box.'),
    y: z.number().min(-100000).max(100000).default(0).describe('Top edge in px from the parent padding box.'),
    width: z.number().min(1).max(100000).optional(),
    height: z.number().min(1).max(100000).optional(),
    d: z.string().trim().min(1).max(VECTOR_PATH_MAX).optional().describe('SVG path data in px from the parent padding box, for example "M0 0 C40 0 60 80 100 80". End with Z to close it.'),
    name: z.string().trim().min(1).max(60).optional().describe('Layer name (data-name). Default Rectangle, Ellipse or Vector.'),
    makeParentRelative: z.boolean().default(false).describe('Also set position: relative on the parent, so x and y count from it. Leave false when the parent is already positioned.'),
    ...paint,
  })
  .strict()
  .refine(oneTarget, 'pass targetSelector or targetSource, not both')
  .refine((input) => (input.shape === 'path' ? input.d !== undefined : input.width !== undefined && input.height !== undefined), 'shape path needs d; rect and ellipse need width and height');

const booleanSchema = z
  .object({
    projectId,
    directionId,
    path: pagePath,
    selectors: z.tuple([selector, selector]).optional().describe('Two CSS selectors or layer ids of SVG shapes: an <svg>, or a <path>, <rect>, <circle>, <ellipse> or <polygon> in one. The first one keeps its place and paint.'),
    sources: z.tuple([z.string().trim().max(1100), z.string().trim().max(1100)]).optional().describe('Or the two shapes as file:line:col. Without selectors, two separate <svg> elements must be placed with left and top in px.'),
    op: z.enum(BOOLEAN_OPS).describe('union, subtract (first minus second), intersect or exclude.'),
  })
  .strict()
  .refine((input) => (input.selectors === undefined) !== (input.sources === undefined), 'pass selectors or sources, not both');

const paintSchema = z
  .object({ projectId, directionId, path: pagePath, targetSelector, targetSource, ...paint })
  .strict()
  .refine(oneTarget, 'pass targetSelector or targetSource, not both')
  .refine((input) => input.fill !== undefined || input.stroke !== undefined || input.strokeWidth !== undefined, 'pass fill, stroke or strokeWidth');

async function callVector(deps: EditDeps, project: Project, direction: Direction, body: VectorRequest): Promise<Done> {
  let result: VectorResult;
  try {
    result = await studioCall<VectorResult>(deps, 'POST', `${base(project, direction.id)}/vector`, body);
  } catch (error) {
    throw new EditError(error instanceof Error ? error.message : String(error));
  }
  const at = result.select.map((item) => `${item.file}:${item.line}:${item.col}`);
  return { result: ok({ file: result.file, title: result.title, at, versionId: result.version?.id ?? null }), activity: versionActivity(project, direction, result.title, result.version) };
}

function paintOf(input: { fill?: string | null | undefined; stroke?: string | null | undefined; strokeWidth?: number | null | undefined }) {
  return { ...(input.fill !== undefined ? { fill: input.fill === 'none' ? null : input.fill } : {}), ...(input.stroke !== undefined ? { stroke: input.stroke } : {}), ...(input.strokeWidth !== undefined ? { strokeWidth: input.strokeWidth } : {}) };
}

const drawVector = defineTool(
  'draw_vector',
  drawSchema,
  { title: 'Draw vector', description: 'Draw a rectangle, an ellipse or a pen path into an element, like the studio Rectangle (R), Ellipse (O) and Pen (Shift+P) tools: it writes an inline <svg> with a fitted viewBox, placed with position: absolute at x, y in the parent, holding one <rect>, <ellipse> or <path>. HTML and JSX. One version and one undo step. Path default: 2 px #1E1E1E stroke, no fill; shapes default to #D9D9D9 fill.' },
  async (deps, input): Promise<Done> => {
    const { project, direction } = await loadTarget(deps, input.projectId, input.directionId);
    refuseWhileRunning(deps, project, direction);
    const target = await targetOf(deps, project, direction, input);
    const common = { target, relativeParent: input.makeParentRelative, ...paintOf(input) };
    const body: VectorRequest =
      input.shape === 'path'
        ? { op: 'path', d: input.d ?? '', ...(input.name ? { name: input.name } : {}), ...common }
        : { op: 'shape', shape: input.shape, box: { x: input.x, y: input.y, width: input.width ?? 1, height: input.height ?? 1 }, ...common };
    return callVector(deps, project, direction, body);
  },
);

async function rectsOf(deps: EditDeps, project: Project, direction: Direction, page: string | undefined, selectors: [string, string]): Promise<[VectorBox, VectorBox] | undefined> {
  const url = await pageUrl(deps, project, direction, page);
  const found = await describeElements(deps.preview, url, selectors).catch(() => []);
  const [a, b] = found;
  return a && b ? [a.rect, b.rect] : undefined;
}

const booleanShapes = defineTool(
  'boolean_shapes',
  booleanSchema,
  { title: 'Boolean shapes', description: 'Union, subtract, intersect or exclude two SVG shapes, like the studio Boolean buttons: it writes one <path> (fill-rule evenodd, curves as short lines) in place of the first shape, with its paint, and removes the second shape (or its <svg> when nothing else is in it). Both shapes must be in one file. One version and one undo step.' },
  async (deps, input): Promise<Done> => {
    const { project, direction } = await loadTarget(deps, input.projectId, input.directionId);
    refuseWhileRunning(deps, project, direction);
    const pick = (index: 0 | 1) => (input.selectors ? { targetSelector: input.selectors[index], path: input.path } : { targetSource: input.sources?.[index], path: input.path });
    const targets: [Awaited<ReturnType<typeof targetOf>>, Awaited<ReturnType<typeof targetOf>>] = [await targetOf(deps, project, direction, pick(0)), await targetOf(deps, project, direction, pick(1))];
    const rects = input.selectors ? await rectsOf(deps, project, direction, input.path, input.selectors) : undefined;
    return callVector(deps, project, direction, { op: 'boolean', boolean: input.op, targets, ...(rects ? { rects } : {}) });
  },
);

const paintShape = defineTool(
  'paint_shape',
  paintSchema,
  { title: 'Paint shape', description: 'Set the fill, stroke color or stroke width of an SVG shape, like the studio Fill and Stroke rows: it writes the fill, stroke and stroke-width attributes. On an <svg> it sets the shapes in it that have their own value, else the <svg>. One version and one undo step.' },
  async (deps, input): Promise<Done> => {
    const { project, direction } = await loadTarget(deps, input.projectId, input.directionId);
    refuseWhileRunning(deps, project, direction);
    const target = await targetOf(deps, project, direction, input);
    return callVector(deps, project, direction, { op: 'paint', target, ...paintOf(input) });
  },
);

export const VECTOR_TOOLS = [drawVector, booleanShapes, paintShape];
