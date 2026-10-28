import { z } from 'zod';
import { ALIGN_OPS, DISTRIBUTE_OPS, arrangeLabel, type ArrangeAction, type ArrangeResult } from '../../shared/arrange.js';
import type { Project } from '../../shared/contracts.js';
import { findFrame, frameRef } from '../canvas/tools.js';
import { ARRANGE_TARGETS_MAX, DEFAULT_ARRANGE_VIEWPORT, measureTargets } from '../direct-edit/arrange.js';
import { DirectEditError } from '../direct-edit/errors.js';
import { EditError, loadTarget, refuseWhileRunning, studioCall, type EditDeps } from './edit-deps.js';
import { base, defineTool, directionId, ok, pagePath, pageUrl, projectId, selector, versionActivity, type Done } from './edit-kit.js';

const frame = frameRef.optional().describe('Canvas frame id or @label from canvas_list. Its page, size and direction are used. Default f1, the entry page.');
const element = z.object({ selector: selector.describe('CSS selector or layer id from get_layers.'), path: pagePath }).strict();

const arrangeSchema = z
  .object({
    projectId,
    directionId,
    frame,
    path: pagePath.describe('Page path instead of the frame page.'),
    targets: z.array(element).min(1).max(ARRANGE_TARGETS_MAX).describe('The elements to arrange. They must be siblings (one parent).'),
    align: z.enum(ALIGN_OPS).optional().describe('Align left, center, right (horizontal) or top, middle, bottom (vertical).'),
    distribute: z.enum(DISTRIBUTE_OPS).optional().describe('Equal spacing between the elements along this axis.'),
    tidy: z.literal(true).optional().describe('Set one equal gap. On a parent with no auto layout it adds auto layout (flex) and removes the margins between the children.'),
  })
  .strict()
  .refine((input) => [input.align, input.distribute, input.tidy].filter((value) => value !== undefined).length === 1, 'pass one of align, distribute or tidy');

const measureSchema = z.object({ projectId, directionId, frame, path: pagePath.describe('Page path instead of the frame page.'), a: element, b: element }).strict();

type Direction = Project['directions'][number];

interface FrameTarget {
  project: Project;
  direction: Direction;
  page: string | undefined;
  viewport: { width: number; height: number };
}

async function frameTarget(deps: EditDeps, input: { projectId: string; directionId?: string | undefined; frame?: string | undefined; path?: string | undefined }): Promise<FrameTarget> {
  const ref = input.frame ?? 'f1';
  const loaded = await loadTarget(deps, input.projectId, input.directionId);
  const frames = (await deps.canvas.read(loaded.project)).canvas?.frames ?? [];
  const found = findFrame(frames, ref);
  if (!found && input.frame !== undefined && !(frames.length === 0 && ref === 'f1')) throw new EditError(`No frame ${ref} on the canvas. Use canvas_list for the frame ids.`);
  const { project, direction } = found?.directionId && input.directionId === undefined ? await loadTarget(deps, input.projectId, found.directionId) : loaded;
  return { project, direction, page: input.path || found?.path || undefined, viewport: found ? { width: found.width, height: found.height } : DEFAULT_ARRANGE_VIEWPORT };
}

function actionOf(input: z.output<typeof arrangeSchema>): ArrangeAction {
  if (input.align) return { align: input.align };
  if (input.distribute) return { distribute: input.distribute };
  return { tidy: true };
}

const arrange = defineTool(
  'arrange',
  arrangeSchema,
  {
    title: 'Align, distribute or tidy up',
    description:
      'Align, distribute or tidy up sibling elements like Figma, with the same code path as the studio arrange bar. In an auto layout (flex) parent it writes the parent layout: align across the axis sets align-items (all children selected) or align-self (some), align along the axis and distribute need all children selected and set justify-content. In a grid it sets justify-items or align-items. Absolute children move by left/top to the selection bounds (one element: to its parent box); distribute needs three or more. A parent with no auto layout refuses align and distribute; tidy adds auto layout to it. In a Tailwind project it writes classes (items-center, justify-between, gap-6, left-4). All changes are one version and one undo step.',
  },
  async (deps, input): Promise<Done> => {
    const target = await frameTarget(deps, input);
    refuseWhileRunning(deps, target.project, target.direction);
    const action = actionOf(input);
    const body = { arrange: { targets: input.targets.map((item) => ({ selector: item.selector })), action, ...(target.page ? { path: target.page } : {}), viewport: target.viewport } };
    const result = await studioCall<ArrangeResult>(deps, 'POST', `${base(target.project, target.direction.id)}/direct-edit`, body);
    const output = { changed: result.changed, mode: result.mode, files: result.files, classes: result.classes, writes: result.writes, versionId: result.changed ? (result.version?.id ?? null) : null, note: result.note ?? (result.changed ? 'All changes are one version and one undo step.' : null) };
    const summary = `${arrangeLabel(action)} on ${input.targets.length === 1 ? '1 element' : `${input.targets.length} elements`}`;
    return { result: ok(output), ...(result.changed ? { activity: versionActivity(target.project, target.direction, summary, result.version) } : {}) };
  },
);

const measure = defineTool(
  'measure',
  measureSchema,
  {
    title: 'Measure between two elements',
    description: 'Measure the distance between two elements on the live page, like holding Alt in the studio: their boxes, how they relate (apart, overlap, a-inside-b, b-inside-a), the horizontal and vertical gap (null when they overlap on that axis), the inset when one is inside the other, the center offset and the red guide lines. Page pixels at the frame size. Read only.',
    readOnly: true,
    idempotent: true,
  },
  async (deps, input): Promise<Done> => {
    const target = await frameTarget(deps, input);
    const url = await pageUrl(deps, target.project, target.direction, target.page);
    try {
      return { result: ok(await measureTargets(deps.preview, url, target.viewport, input.a.selector, input.b.selector)) };
    } catch (error) {
      if (error instanceof DirectEditError) throw new EditError(error.message);
      throw error;
    }
  },
);

export const ARRANGE_TOOLS = [arrange, measure];
