import { z } from 'zod';
import type { DirectEditResult, SourceLoc, StructureEditResult } from '../../shared/contracts.js';
import { EditError, loadTarget, refuseWhileRunning, studioCall, type EditDeps } from './edit-deps.js';
import { base, defineTool, directionId, ok, pagePath, pageUrl, projectId, selector, sourceElement, versionActivity, type Done } from './edit-kit.js';

const moveSchema = z
  .object({
    projectId,
    directionId,
    path: pagePath,
    selector: selector.describe('CSS selector or layer id of the element to move.'),
    before: selector.optional().describe('Put the element just before this sibling (CSS selector or layer id).'),
    after: selector.optional().describe('Put the element just after this sibling (CSS selector or layer id).'),
    copy: z.boolean().optional().describe('true leaves the element where it is and puts a copy at the new place, like Alt+drag in the studio.'),
    left: z.number().finite().optional().describe('Absolute move: the new CSS left in px, like a drag of an absolute element on the canvas. Leave out before and after.'),
    top: z.number().finite().optional().describe('Absolute move: the new CSS top in px. Leave out before and after.'),
  })
  .strict()
  .refine((input) => [input.before, input.after, input.left ?? input.top].filter((value) => value !== undefined).length === 1, 'pass one of before, after, or left/top')
  .refine((input) => !(input.copy && (input.left !== undefined || input.top !== undefined)), 'copy works only with before or after');

type MoveInput = z.output<typeof moveSchema>;

const NOT_ABSOLUTE = 'left and top move only an element with position absolute or fixed. Pass before or after to reorder it among its siblings, or set position first with edit_element.';

async function moveAbsolute(deps: EditDeps, input: MoveInput): Promise<Done> {
  const { project, direction } = await loadTarget(deps, input.projectId, input.directionId);
  refuseWhileRunning(deps, project, direction);
  const element = await sourceElement(deps, await pageUrl(deps, project, direction, input.path), input.selector);
  const position = element.styles.position ?? '';
  if (position !== 'absolute' && position !== 'fixed') throw new EditError(NOT_ABSOLUTE);
  const style: Record<string, string> = {};
  if (input.left !== undefined) style.left = `${Math.round(input.left)}px`;
  if (input.top !== undefined) style.top = `${Math.round(input.top)}px`;
  const target = element.component ? { component: element.component } : { tag: element.tag.toLowerCase() };
  const result = await studioCall<DirectEditResult>(deps, 'POST', `${base(project, direction.id)}/direct-edit`, { source: element.source, selector: input.selector, ...target, style });
  const summary = `Moved ${element.tag} to ${Object.entries(style).map(([key, value]) => `${key} ${value}`).join(', ')}`;
  return { result: ok({ file: result.file, versionId: result.version.id, title: result.version.title, applied: result.applied, style }), activity: versionActivity(project, direction, summary, result.version) };
}

function siteOf(element: Awaited<ReturnType<typeof sourceElement>>): { source: SourceLoc; tag?: string } {
  return element.usedBy?.root && element.usedAt ? { source: element.usedAt } : { source: element.source, tag: element.tag };
}

const moveElement = defineTool(
  'move_element',
  moveSchema,
  {
    title: 'Move element among siblings',
    description:
      'Reorder an element among its siblings, like a drag on the studio canvas inside an auto layout (flex, grid) or a normal flow parent: it moves the JSX or HTML of the element to just before or after another element, with the same code path as the canvas drag. Pass copy to duplicate the element at that place instead (Alt+drag). Both elements must be in the same file; elements made by .map() are refused. To move an absolute or fixed element, pass left and/or top in px instead of before or after: it writes left and top like a canvas drag. One call makes one version, so the user can undo it.',
  },
  async (deps: EditDeps, input): Promise<Done> => {
    if (input.before === undefined && input.after === undefined) return moveAbsolute(deps, input);
    const { project, direction } = await loadTarget(deps, input.projectId, input.directionId);
    refuseWhileRunning(deps, project, direction);
    const url = await pageUrl(deps, project, direction, input.path);
    const refSelector = (input.before ?? input.after) as string;
    const [element, ref] = await Promise.all([sourceElement(deps, url, input.selector), sourceElement(deps, url, refSelector)]);
    const place = { ...siteOf(ref), selector: refSelector };
    const body = { op: input.copy ? 'duplicate' : 'move', targets: [{ ...siteOf(element), selector: input.selector }], ...(input.before ? { before: place } : { after: place }) };
    const result = await studioCall<StructureEditResult>(deps, 'POST', `${base(project, direction.id)}/direct-edit`, body);
    const summary = `${input.copy ? 'Copied' : 'Moved'} ${element.tag} ${input.before ? 'before' : 'after'} ${ref.tag}`;
    return { result: ok({ files: result.files, versionId: result.version.id, title: result.version.title, select: result.select }), activity: versionActivity(project, direction, summary, result.version) };
  },
);

export const MOVE_TOOLS = [moveElement];
