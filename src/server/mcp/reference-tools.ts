import { stat } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { findFrame, frameRef } from '../canvas/tools.js';
import { compareToReference, mimeOfPath, scoreLines } from '../agent/reference-check.js';
import { REFERENCE_LOW_SCORE } from '../../shared/reference.js';
import type { ReferenceScore } from '../../shared/reference.js';
import { EditError, loadTarget, type EditDeps } from './edit-deps.js';
import { defineTool, directionId, ok, pagePath, pageUrl, projectId, type Done } from './edit-kit.js';

const MAX_BYTES = 20 * 1024 * 1024;

export const COMPARE_TO_REFERENCE_TEXT = `Compare a canvas frame with a reference picture (a screenshot or mock, PNG, JPEG, GIF or WebP). The studio renders the frame at the frame width and the picture's aspect, scales the picture to that size, and returns a match score from 0 to 100 made of two parts: content (20%: of the pixels that are not plain background in either image, the percent that match in color, compared at 160 px wide) and edges (80%: how well the outlines of text, boxes, icons and pictures line up, to 2 px at 320 px wide, squared, so a moved column, a wrong icon or a CSS shape in place of a photo cost points while flat background does not help). It also returns both parts for the 3x3 areas that differ most with their x/y boxes, and the path of a side-by-side diff PNG (reference, render, render with the different pixels in red). A score under ${REFERENCE_LOW_SCORE} means the frame does not match the picture yet: fix the areas with the lowest edge numbers first. Read only; changes no file.`;

const schema = z
  .object({
    projectId,
    directionId,
    image: z.string().trim().min(1).max(4096).describe('Absolute path of the reference picture on this computer.'),
    frame: frameRef.optional().describe('Frame id or @label from canvas_list. Leave out for the first frame of the direction.'),
    path: pagePath,
  })
  .strict();

type Input = z.output<typeof schema>;

export function scoreOutput(score: ReferenceScore) {
  return { score: score.score, contentScore: score.contentScore, edgeScore: score.edgeScore, matches: score.score >= REFERENCE_LOW_SCORE, size: `${score.width}x${score.height}`, differsPct: score.differsPct, worst: score.regions.slice(0, 4), diffPath: score.diffPath, renderPath: score.renderPath, ms: score.ms, notes: scoreLines(score) };
}

async function checkImage(file: string): Promise<string> {
  if (!path.isAbsolute(file)) throw new EditError('image must be an absolute path.');
  const mime = mimeOfPath(file);
  if (!mime) throw new EditError('image must be a .png, .jpg, .jpeg, .gif or .webp file.');
  const info = await stat(file).catch(() => null);
  if (!info?.isFile()) throw new EditError(`No file at ${file}.`);
  if (info.size > MAX_BYTES) throw new EditError('image is larger than 20 MB.');
  return mime;
}

async function frameOf(deps: EditDeps, target: Awaited<ReturnType<typeof loadTarget>>, input: Input) {
  const all = (await deps.canvas.read(target.project)).canvas?.frames ?? [];
  if (input.frame) {
    const found = findFrame(all, input.frame);
    if (!found) throw new EditError(`No frame ${input.frame} on the canvas. Call canvas_list for frame ids.`);
    return found;
  }
  return all.filter((frame) => !frame.hidden && (!frame.directionId || frame.directionId === target.direction.id)).sort((a, b) => a.order - b.order)[0] ?? null;
}

const compareTool = defineTool(
  'compare_to_reference',
  schema,
  { title: 'Compare to a reference picture', description: COMPARE_TO_REFERENCE_TEXT, readOnly: true, idempotent: true },
  async (deps, input): Promise<Done> => {
    const mime = await checkImage(input.image);
    const target = await loadTarget(deps, input.projectId, input.directionId);
    const frame = await frameOf(deps, target, input);
    const page = input.path ?? frame?.path;
    const url = await pageUrl(deps, target.project, target.direction, page);
    const stem = `${target.project.id}-${(frame?.id ?? 'page').replace(/[^A-Za-z0-9_-]/g, '')}-${Date.now().toString(36)}`;
    const score = await compareToReference({ preview: deps.preview, url, file: input.image, mime, ...(frame ? { frameWidth: frame.width } : {}), outDir: path.join(deps.dataDir, 'reference'), stem });
    return { result: ok({ frame: frame ? { id: frame.id, label: frame.label ?? null, path: frame.path ?? '' } : null, ...scoreOutput(score) }) };
  },
);

export const REFERENCE_TOOLS = [compareTool];
