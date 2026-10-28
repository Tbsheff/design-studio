import { z } from 'zod';
import { COMPONENT_LIST_MAX, COMPONENT_SOURCES } from '../../shared/props.js';
import { canvasOwner, readCanvasAt } from '../canvas/service.js';
import { findFrame, frameRef } from '../canvas/tools.js';
import { listComponentSchemas } from '../components/props-service.js';
import { isLayerRef, LayerRefError, memoPage, resolveLayerRef, scopeOf, type Viewport } from '../mcp/layer-ref.js';
import { layerTreeText } from '../mcp/layer-tools.js';
import type { DirectToolDeps } from './direct-tools.js';
import { editPage, editPageUrl, pageUrl } from './run-target.js';
import { DEFAULT_FRAME_STATE } from '../../shared/frame-state.js';

type ToolText = { content: { type: 'text'; text: string }[]; isError?: boolean };

const EDIT_VIEWPORT: Viewport = { width: 1440, height: 900 };
const SELECTOR_KEYS = ['selector', 'targetSelector'] as const;

export const listComponentsShape = {
  query: z.string().trim().max(100).optional().describe('Search text: matches the component name first (exact, then prefix, then part), then its folder or file, then the props, variants and other text of its file. For example "badge" or "card".'),
  source: z.enum(COMPONENT_SOURCES).optional().describe('"package" for components of shared workspace packages (such as packages/ui), "app" for components in the app, "all" (default) for both. Package components always come first.'),
  limit: z.number().int().min(1).max(COMPONENT_LIST_MAX).optional().describe('Components per page. Default 20.'),
  cursor: z.string().regex(/^\d{1,6}$/).optional().describe('nextCursor from the previous page.'),
};

export const getLayersShape = {
  frame: frameRef.optional().describe('Canvas frame id or @label from canvas_list. It sets the page and the size. Leave out for the frame in <canvas-context>.'),
  path: z.string().trim().max(300).optional().describe('Page path instead of the frame page. Leave out for the page of the frame in <canvas-context> (or the entry page).'),
  root: z.string().trim().min(1).max(2000).optional().describe('Layer id from an earlier get_layers or a CSS selector: list only this element and what is inside it.'),
  depth: z.number().int().min(0).max(30).default(8).describe('Levels below the root to list. Default 8. Deeper children show as "+N inside".'),
};

const listSchema = z.object(listComponentsShape).strict();
const layersSchema = z.object(getLayersShape).strict();

function text(message: string, isError = false): ToolText {
  return { content: [{ type: 'text', text: message }], ...(isError ? { isError: true } : {}) };
}

function issues(error: z.ZodError): string {
  return error.issues.map((issue) => `${issue.path.join('.') || 'input'}: ${issue.message}`).join('; ');
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function runListComponents(deps: DirectToolDeps, args: z.input<typeof listSchema>): Promise<ToolText> {
  const parsed = listSchema.safeParse(args);
  if (!parsed.success) return text(`list_components: ${issues(parsed.error)}`, true);
  const { project, direction } = deps.ctx;
  if (project.kind !== 'react') return text(JSON.stringify({ components: [], note: 'This is an HTML project; it has no React components.' }));
  try {
    const { query, source, limit, cursor } = parsed.data;
    const list = await listComponentSchemas(project, direction.workTree, { limit: limit ?? 20, ...(query ? { query } : {}), ...(source ? { source } : {}), ...(cursor ? { cursor } : {}) });
    return text(JSON.stringify(list, null, 2));
  } catch (error) {
    return text(`list_components failed: ${describeError(error)}`, true);
  }
}

async function framePage(deps: DirectToolDeps, ref: string | undefined): Promise<{ path?: string; viewport: Viewport; state: string }> {
  const target = deps.ctx.target;
  if (!ref) return target ? { viewport: { width: target.width, height: target.height }, state: target.state, ...(target.path ? { path: target.path } : {}) } : { viewport: EDIT_VIEWPORT, state: DEFAULT_FRAME_STATE };
  const frames = (await readCanvasAt(canvasOwner(deps.ctx.project).workTree)).canvas?.frames ?? [];
  const frame = findFrame(frames, ref);
  if (!frame) throw new LayerRefError(`No frame ${ref} on the canvas. Call canvas_list for the frame ids.`);
  const state = frame.id === target?.id ? target.state : DEFAULT_FRAME_STATE;
  return { viewport: { width: frame.width, height: frame.height }, state, ...(frame.path ? { path: frame.path } : {}) };
}

export async function runGetLayers(deps: DirectToolDeps, args: z.input<typeof layersSchema>): Promise<ToolText> {
  const parsed = layersSchema.safeParse(args);
  if (!parsed.success) return text(`get_layers: ${issues(parsed.error)}`, true);
  if (!deps.ctx.previewUrl) return text('Preview is not running for this direction, so the layers cannot be read.', true);
  try {
    const frame = await framePage(deps, parsed.data.frame);
    const page = parsed.data.path ?? frame.path;
    const url = pageUrl(deps.ctx.previewUrl, page ?? '', frame.state);
    const scope = scopeOf(deps.ctx.project.id, deps.ctx.direction.id);
    const tree = await layerTreeText(deps.preview, { url, viewport: frame.viewport, scope, page, root: parsed.data.root, depth: parsed.data.depth });
    return tree === null ? text(`No element matches ${parsed.data.root} on the page.`, true) : text(tree);
  } catch (error) {
    return text(error instanceof LayerRefError ? error.message : `get_layers failed: ${describeError(error)}`, true);
  }
}

type LayerArgs = { path?: string | undefined } & Partial<Record<(typeof SELECTOR_KEYS)[number], string | undefined>>;

async function resolveSelectors<A extends LayerArgs>(deps: DirectToolDeps, args: A): Promise<A> {
  const keys = SELECTOR_KEYS.filter((key) => isLayerRef(args[key]));
  if (keys.length === 0 || !deps.ctx.previewUrl) return args;
  const scope = scopeOf(deps.ctx.project.id, deps.ctx.direction.id);
  const out: A = { ...args };
  for (const key of keys) {
    const ref = String(args[key]).trim();
    const page = args.path ?? memoPage(scope, ref) ?? editPage(deps.ctx, undefined)?.path;
    out[key] = (await resolveLayerRef(deps.preview, editPageUrl(deps.ctx, page), EDIT_VIEWPORT, scope, ref)) as A[typeof key];
    if (out.path === undefined && page !== undefined) out.path = page;
  }
  return out;
}

export function withLayerIds<A extends LayerArgs>(deps: DirectToolDeps, run: (args: A) => Promise<ToolText>): (args: A) => Promise<ToolText> {
  return async (args) => {
    let resolved: A;
    try {
      resolved = await resolveSelectors(deps, args);
    } catch (error) {
      return text(error instanceof LayerRefError ? error.message : `Layer id lookup failed: ${describeError(error)}`, true);
    }
    return run(resolved);
  };
}
