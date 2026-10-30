import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { EXPORT_MAX_FRAMES, type ExportFrame } from '../../shared/export.js';
import { findFrame, frameRef } from '../canvas/tools.js';
import { EditError, loadTarget, oneLine, studioFile, writeUnique, type EditDeps } from './edit-deps.js';
import { defineTool, directionId, id, ok, pageUrl, projectId, selector } from './edit-kit.js';
import { isLayerRef, LayerRefError, resolveLayerRef, scopeOf } from './layer-ref.js';

export const EXPORT_FRAME_TEXT =
  'Export canvas frames as SVG or PPTX with the same server code as Export > SVG and Export > PPTX in the studio. SVG: one vector file per frame (a zip for several), with boxes, borders and inline SVG as shapes, text as <text> with its font names (web fonts embedded when the page loads them), and pictures, gradients and canvas kept as embedded images; selector exports one element. PPTX: one slide per frame (a page with two or more .slide or [data-slide] sections gives one slide per section), each with native, editable text boxes (font, size, weight, color, alignment, line height), solid, gradient and rounded boxes with outer shadows, rules as lines, inline SVG shapes, arcs and SVG text, and images (also rounded) as pictures, on a full-slide picture of the rest (background images, filters, inset shadows) with those parts left out. Returns the path of the file in the Design Studio data folder. Changes no design file.';

const schema = z
  .object({
    projectId,
    directionId,
    format: z.enum(['svg', 'pptx']).describe('svg: vector file. pptx: slide deck.'),
    frames: z.array(frameRef).min(1).max(EXPORT_MAX_FRAMES).optional().describe('Frame ids or @labels from canvas_list. Leave out for every visible frame of the direction.'),
    selector: selector.optional().describe('SVG only: a layer id from get_layers or a CSS selector; exports just that element of the first frame.'),
    area: z.enum(['frame', 'page']).default('frame').describe('SVG only: frame (the visible frame) or page (the full page height).'),
    versionId: id('Version id. Leave out for the newest version of the direction.').optional(),
  })
  .strict();

type Input = z.output<typeof schema>;
type Loaded = Awaited<ReturnType<typeof loadTarget>>;

const DEFAULT_FRAME: ExportFrame = { name: 'Desktop', width: 1440, height: 900 };

async function framesFor(deps: EditDeps, target: Loaded, refs: string[] | undefined): Promise<ExportFrame[]> {
  const all = (await deps.canvas.read(target.project)).canvas?.frames ?? [];
  const toExport = (frame: (typeof all)[number]): ExportFrame => ({ name: frame.label?.trim() || `${frame.width} × ${frame.height}`, width: frame.width, height: frame.height, ...(frame.path ? { path: frame.path } : {}) });
  if (refs) {
    return refs.map((ref) => {
      const found = findFrame(all, ref);
      if (!found) throw new EditError(`No frame ${ref} on the canvas. Call canvas_list for frame ids.`);
      return toExport(found);
    });
  }
  const own = all.filter((frame) => !frame.hidden && (!frame.directionId || frame.directionId === target.direction.id)).sort((a, b) => a.order - b.order);
  return own.length > 0 ? own.slice(0, EXPORT_MAX_FRAMES).map(toExport) : [DEFAULT_FRAME];
}

async function cssSelector(deps: EditDeps, target: Loaded, frame: ExportFrame, raw: string | undefined): Promise<string | undefined> {
  if (!raw || !isLayerRef(raw)) return raw;
  const url = await pageUrl(deps, target.project, target.direction, frame.path);
  try {
    return await resolveLayerRef(deps.preview, url, { width: frame.width, height: frame.height }, scopeOf(target.project.id, target.direction.id), raw.trim());
  } catch (error) {
    if (error instanceof LayerRefError) throw new EditError(error.message);
    throw error;
  }
}

async function run(deps: EditDeps, input: Input) {
  const target = await loadTarget(deps, input.projectId, input.directionId);
  const versionId = input.versionId ?? target.direction.headVersionId;
  if (!versionId) throw new EditError('This direction has no saved version yet.');
  if (input.selector && input.format === 'pptx') throw new EditError('selector works with format svg only.');
  const all = await framesFor(deps, target, input.frames);
  const [first] = all;
  const frames = input.selector && first ? [first] : all;
  const css = first ? await cssSelector(deps, target, first, input.selector) : undefined;
  const output = await studioFile(deps, 'POST', `/api/projects/${encodeURIComponent(target.project.id)}/export`, { format: input.format, versionId, frames, scale: 1, scope: input.area, ...(css ? { selector: css } : {}) });
  const folder = path.join(deps.dataDir, 'exports', target.project.id);
  await mkdir(folder, { recursive: true });
  const file = await writeUnique(folder, output.name, output.bytes);
  const format = input.format.toUpperCase();
  return {
    result: ok({ file, format: input.format, bytes: output.bytes.byteLength, versionId, frames: frames.map((frame) => frame.name), ...(output.note ? { note: output.note } : {}) }),
    activity: { projectId: target.project.id, directionId: target.direction.id, summary: `Exported ${format} to ${oneLine(file, 120)}` },
  };
}

const exportFrame = defineTool('export_frame', schema, { title: 'Export frame as SVG or PPTX', description: EXPORT_FRAME_TEXT }, (deps, input) => run(deps, input));

export const EXPORT_TOOLS = [exportFrame];
