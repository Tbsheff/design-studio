import { z } from 'zod';
import { MATCH_KINDS, type MatchKind, type Project } from '../../shared/contracts.js';
import { findFrame, frameRef } from '../canvas/tools.js';
import type { PreviewService } from '../types.js';
import { EditError, loadTarget, type EditDeps } from './edit-deps.js';
import { defineTool, directionId, ok, pagePath, pageUrl, projectId, selector, type Done } from './edit-kit.js';
import { isLayerRef, LayerRefError, layersAtPaths, memoPage, resolveLayerRef, scopeOf, type Viewport } from './layer-ref.js';

const DEFAULT_VIEWPORT: Viewport = { width: 1440, height: 900 };
const HEADLESS_MATCH = 'window.__studioSelectMatching';

export const MATCH_BY_TEXT = 'component: every copy of the same element or component (the same JSX source; for a component root such as a Card, every Card); classes: elements with exactly the same class list; text-style: elements with their own text and the same font family, size, weight, style, line height, tracking and text transform (color is ignored).';

export const SELECT_MATCHING_TEXT =
  'Find the elements that match one element, like Select matching in the studio inspector, and return their layer ids (the same ids get_layers lists) with tag and text. Use it before a change that should apply to every copy: pass the ids to edit_element or batch_edit as selectors, or to arrange as targets. Read only; it does not change the studio selection.';

export interface MatchedLayer {
  id: string;
  tag: string;
  text: string;
  component: string | null;
  source: string | null;
}

export interface MatchReport {
  by: MatchKind;
  count: number;
  layers: MatchedLayer[];
  note?: string;
}

interface HeadlessMatch {
  found: boolean;
  paths: string[];
  note?: string;
}

export interface MatchInput {
  url: string;
  viewport: Viewport;
  scope: string;
  page: string | undefined;
  selector: string;
  by: MatchKind;
}

export async function selectMatchingOnPage(preview: PreviewService, input: MatchInput): Promise<MatchReport> {
  const css = isLayerRef(input.selector) ? await resolveLayerRef(preview, input.url, input.viewport, input.scope, input.selector.trim()) : input.selector;
  const { layers, extra } = await layersAtPaths(preview, input.url, input.viewport, input.scope, input.page, async (probe) => {
    const ready = await probe.evaluate<boolean>(`typeof ${HEADLESS_MATCH} === 'function'`);
    if (!ready) throw new LayerRefError('This page has no studio bridge script, so matching elements cannot be found.');
    const found = await probe.evaluate<HeadlessMatch>(`${HEADLESS_MATCH}(${JSON.stringify(css)}, ${JSON.stringify(input.by)})`);
    return { paths: found.found ? found.paths : [], extra: found };
  });
  if (!extra.found) throw new LayerRefError(`No element matches ${input.selector} on the page.`);
  const matched = layers.filter((layer) => layer !== null).map((layer) => ({ id: layer.ref, tag: layer.tag, text: layer.text, component: layer.comp, source: (layer.comp && layer.used) || layer.own }));
  return { by: input.by, count: matched.length, layers: matched, ...(extra.note ? { note: extra.note } : {}) };
}

const schema = z
  .object({
    projectId,
    directionId,
    frame: frameRef.optional().describe('Canvas frame id or @label from canvas_list. Its page, size and direction are used. Default f1, the entry page.'),
    path: pagePath.describe('Page path instead of the frame page.'),
    selector: selector.describe('The element to match: a layer id from get_layers or a CSS selector.'),
    by: z.enum(MATCH_KINDS).describe(MATCH_BY_TEXT),
  })
  .strict();

type Direction = Project['directions'][number];

async function frameTarget(deps: EditDeps, input: z.output<typeof schema>): Promise<{ project: Project; direction: Direction; page: string | undefined; viewport: Viewport }> {
  const loaded = await loadTarget(deps, input.projectId, input.directionId);
  const frames = (await deps.canvas.read(loaded.project)).canvas?.frames ?? [];
  const ref = input.frame ?? 'f1';
  const found = findFrame(frames, ref);
  if (!found && input.frame !== undefined && !(frames.length === 0 && ref === 'f1')) throw new EditError(`No frame ${ref} on the canvas. Use canvas_list for the frame ids.`);
  const { project, direction } = found?.directionId && input.directionId === undefined ? await loadTarget(deps, input.projectId, found.directionId) : loaded;
  const remembered = input.frame === undefined && input.path === undefined && isLayerRef(input.selector) ? memoPage(scopeOf(project.id, direction.id), input.selector.trim()) : undefined;
  return { project, direction, page: input.path || remembered || found?.path || undefined, viewport: found ? { width: found.width, height: found.height } : DEFAULT_VIEWPORT };
}

const selectMatching = defineTool(
  'select_matching',
  schema,
  { title: 'Select matching elements', description: SELECT_MATCHING_TEXT, readOnly: true, idempotent: true },
  async (deps, input): Promise<Done> => {
    const target = await frameTarget(deps, input);
    const url = await pageUrl(deps, target.project, target.direction, target.page);
    try {
      const report = await selectMatchingOnPage(deps.preview, { url, viewport: target.viewport, scope: scopeOf(target.project.id, target.direction.id), page: target.page, selector: input.selector, by: input.by });
      return { result: ok({ page: target.page ?? '', ...report }) };
    } catch (error) {
      if (error instanceof LayerRefError) throw new EditError(error.message);
      throw error;
    }
  },
);

export const SELECT_TOOLS = [selectMatching];
