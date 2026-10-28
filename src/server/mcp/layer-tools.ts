import { z } from 'zod';
import type { Project } from '../../shared/contracts.js';
import { readProjectCanvas } from '../canvas/service.js';
import { findFrame, frameRef } from '../canvas/tools.js';
import { EditError, loadTarget, type EditDeps } from './edit-deps.js';
import { defineTool, directionId, ok, pagePath, pageUrl, projectId, selector, type Done } from './edit-kit.js';
import { isLayerRef, LayerRefError, memoPage, resolveLayerRef, scanLayers, scopeOf, type Layer, type Viewport } from './layer-ref.js';

type Direction = Project['directions'][number];
type Args = Record<string, unknown>;

const EDIT_VIEWPORT: Viewport = { width: 1440, height: 900 };
const LAYERS_MAX = 400;

const layersSchema = z
  .object({
    projectId,
    directionId,
    frame: frameRef.optional().describe('Canvas frame id or @label from canvas_list. It sets the page, the size and the direction.'),
    path: pagePath,
    root: selector.optional().describe('Layer id from an earlier get_layers or a CSS selector: list only this element and what is inside it. Leave out for the whole page.'),
    depth: z.number().int().min(0).max(30).default(8).describe('Levels below the root to list. Default 8. Deeper children show as "+N inside".'),
  })
  .strict();

async function frameTarget(deps: EditDeps, project: Project, ref: string | undefined): Promise<{ path?: string; viewport: Viewport; directionId?: string }> {
  if (!ref) return { viewport: EDIT_VIEWPORT };
  const frames = (await readProjectCanvas(project, (id) => deps.projects.projectDir(id))).canvas?.frames ?? [];
  const frame = findFrame(frames, ref);
  if (!frame) throw new EditError(`No frame ${ref} on the canvas. Call canvas_list for the frame ids.`);
  return { viewport: { width: frame.width, height: frame.height }, ...(frame.path ? { path: frame.path } : {}), ...(frame.directionId ? { directionId: frame.directionId } : {}) };
}

function shortLoc(loc: string): string {
  return loc.replace(/:\d+$/, '');
}

function fileNamer(layers: Layer[]): (loc: string) => string {
  const byBase = new Map<string, Set<string>>();
  for (const layer of layers) {
    for (const loc of [layer.own, layer.used]) {
      if (!loc) continue;
      const file = loc.replace(/:\d+(:\d+)?$/, '');
      const base = file.split('/').pop() as string;
      byBase.set(base, (byBase.get(base) ?? new Set()).add(file));
    }
  }
  const named = new Set<string>();
  return (loc) => {
    const file = loc.replace(/:\d+$/, '').replace(/:\d+$/, '');
    const base = file.split('/').pop() as string;
    if ((byBase.get(base)?.size ?? 0) > 1 || !named.has(file)) {
      named.add(file);
      return shortLoc(loc);
    }
    return shortLoc(`${base}${loc.slice(file.length)}`);
  };
}

function line(layer: Layer, depth: number, maxDepth: number, nameOf: (loc: string) => string): string {
  const loc = layer.comp && layer.used ? layer.used : layer.own;
  const src = loc ? nameOf(loc) : '';
  const parts = [`${'  '.repeat(depth)}${layer.ref} ${layer.tag}`];
  if (layer.comp) parts.push(`<${layer.comp}>`);
  if (src) parts.push(src);
  if (layer.text) parts.push(JSON.stringify(layer.text));
  if (layer.hidden) parts.push('hidden');
  if (depth >= maxDepth && layer.childCount > 0) parts.push(`+${layer.childCount} inside`);
  return parts.join(' ');
}

function outline(layers: Layer[], maxDepth: number): string[] {
  const shown = layers.filter((layer) => layer.depth >= 0);
  const nameOf = fileNamer(shown);
  return shown.map((layer) => line(layer, layer.depth, maxDepth, nameOf));
}

async function rootSelector(deps: EditDeps, url: string, viewport: Viewport, scope: string, root: string | undefined): Promise<string | null> {
  if (!root) return null;
  return isLayerRef(root) ? resolveForEdit(deps, url, viewport, scope, root.trim()) : root;
}

const getLayers = defineTool(
  'get_layers',
  layersSchema,
  {
    title: 'Get layer tree',
    description:
      'List the elements of a rendered page as a compact tree, one element per line: layer id, tag, <Component> when the element is the root of a component (Card, Badge), source file:line (the use site for a component root, else the JSX that makes the element), a text preview, and "+N inside" when deeper levels are cut. Each layer id (such as "e0k3pz") works in place of a CSS selector in every tool that takes selector or targetSelector (edit_element, batch_edit, set_props, insert_component, add_link, add_comment, canvas_point) and as element in get_screenshot. Ids come from the source location, so they stay the same after edits and hot reloads while that JSX stays on the same line. Use root to list one part of the page.',
    readOnly: true,
    idempotent: true,
  },
  async (deps, input): Promise<Done> => {
    const loaded = await loadTarget(deps, input.projectId, input.directionId);
    const frame = await frameTarget(deps, loaded.project, input.frame);
    const { project, direction } = frame.directionId && !input.directionId ? await loadTarget(deps, input.projectId, frame.directionId) : loaded;
    const page = input.path ?? frame.path;
    const url = await pageUrl(deps, project, direction, page);
    const scope = scopeOf(project.id, direction.id);
    const root = await rootSelector(deps, url, frame.viewport, scope, input.root);
    const tree = await scanLayers(deps.preview, url, frame.viewport, scope, page, { root, depth: input.depth, max: LAYERS_MAX });
    if (!tree) throw new EditError(`No element matches ${input.root} on the page.`);
    const shown = tree.layers.filter((layer) => layer.depth >= 0).length;
    const head = `${page || '(entry page)'} ${frame.viewport.width}×${frame.viewport.height} · ${shown} layers${tree.truncated ? ` (cut at ${LAYERS_MAX}; pass root or a lower depth)` : ''}`;
    return { result: ok([head, ...outline(tree.layers, input.depth)].join('\n')) };
  },
);

export const LAYER_TOOLS = [getLayers];

function selectorSlots(args: Args): { holder: Args; key: string }[] {
  const slots: { holder: Args; key: string }[] = [];
  const visit = (holder: Args) => {
    for (const key of ['selector', 'targetSelector']) if (isLayerRef(holder[key])) slots.push({ holder, key });
  };
  visit(args);
  for (const value of Object.values(args)) {
    if (!Array.isArray(value)) continue;
    for (const item of value) if (item && typeof item === 'object' && !Array.isArray(item)) visit(item as Args);
  }
  return slots;
}

async function directionOf(deps: EditDeps, args: Args): Promise<{ project: Project; direction: Direction } | null> {
  if (typeof args.projectId !== 'string') return null;
  return loadTarget(deps, args.projectId, typeof args.directionId === 'string' ? args.directionId : undefined);
}

function copyArgs(args: Args): Args {
  const out: Args = { ...args };
  for (const [key, value] of Object.entries(args)) if (Array.isArray(value)) out[key] = value.map((item) => (item && typeof item === 'object' ? { ...item } : item));
  return out;
}

function stringAt(holder: Args, key: string): string | undefined {
  return typeof holder[key] === 'string' ? (holder[key] as string) : undefined;
}

async function resolveForEdit(deps: EditDeps, url: string, viewport: Viewport, scope: string, ref: string): Promise<string> {
  try {
    return await resolveLayerRef(deps.preview, url, viewport, scope, ref);
  } catch (error) {
    if (error instanceof LayerRefError) throw new EditError(error.message);
    throw error;
  }
}

export async function withLayerSelectors(deps: EditDeps, args: Args, takesPath: boolean): Promise<Args> {
  if (selectorSlots(args).length === 0) return args;
  const target = await directionOf(deps, args);
  if (!target) return args;
  const scope = scopeOf(target.project.id, target.direction.id);
  const out = copyArgs(args);
  for (const slot of selectorSlots(out)) {
    const ref = String(slot.holder[slot.key]).trim();
    const nested = slot.holder !== out;
    const page = stringAt(slot.holder, 'path') ?? (nested ? stringAt(out, 'path') : undefined) ?? memoPage(scope, ref);
    slot.holder[slot.key] = await resolveForEdit(deps, await pageUrl(deps, target.project, target.direction, page), EDIT_VIEWPORT, scope, ref);
    if (page !== undefined && slot.holder.path === undefined && (nested || takesPath)) slot.holder.path = page;
  }
  return out;
}
