import { z } from 'zod';
import type { StructureEditResult } from '../../shared/contracts.js';
import { loadTarget, refuseWhileRunning, studioCall, type EditDeps } from './edit-deps.js';
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
  })
  .strict()
  .refine((input) => (input.before === undefined) !== (input.after === undefined), 'pass one of before or after');

const moveElement = defineTool(
  'move_element',
  moveSchema,
  {
    title: 'Move element among siblings',
    description:
      'Reorder an element among its siblings, like a drag on the studio canvas inside an auto layout (flex, grid) or a normal flow parent: it moves the JSX or HTML of the element to just before or after another element, with the same code path as the canvas drag. Pass copy to duplicate the element at that place instead (Alt+drag). Both elements must be in the same file; elements made by .map() are refused. To move an absolute element to a new position, use edit_element with style left and top. One call makes one version, so the user can undo it.',
  },
  async (deps: EditDeps, input): Promise<Done> => {
    const { project, direction } = await loadTarget(deps, input.projectId, input.directionId);
    refuseWhileRunning(deps, project, direction);
    const url = await pageUrl(deps, project, direction, input.path);
    const refSelector = (input.before ?? input.after) as string;
    const [element, ref] = await Promise.all([sourceElement(deps, url, input.selector), sourceElement(deps, url, refSelector)]);
    const place = { source: ref.source, selector: refSelector, tag: ref.tag };
    const body = { op: input.copy ? 'duplicate' : 'move', targets: [{ source: element.source, selector: input.selector, tag: element.tag }], ...(input.before ? { before: place } : { after: place }) };
    const result = await studioCall<StructureEditResult>(deps, 'POST', `${base(project, direction.id)}/direct-edit`, body);
    const summary = `${input.copy ? 'Copied' : 'Moved'} ${element.tag} ${input.before ? 'before' : 'after'} ${ref.tag}`;
    return { result: ok({ files: result.files, versionId: result.version.id, title: result.version.title, select: result.select }), activity: versionActivity(project, direction, summary, result.version) };
  },
);

export const MOVE_TOOLS = [moveElement];
