import { z } from 'zod';
import { addLink, frameLabel, linkSpecSchema, listLinks, probeWithPreview, removeLink, setStartFrame } from '../canvas/link-tools.js';
import { frameRef, type CanvasToolContext } from '../canvas/tools.js';
import { EditError, loadTarget, refuseWhileRunning, type EditDeps } from './edit-deps.js';
import { defineTool, directionId, projectId, type Done } from './edit-kit.js';
import { describeElements } from './element.js';

const LINKS_NOTE = 'Links live in the studio (.studio/links.json), not in the page code, so they work for HTML, React and attached app routes. Play in the studio starts at the start frame; a click on a linked element goes to its frame. Links save with the next version, like the canvas layout.';

async function contextOf(deps: EditDeps, input: { projectId: string; directionId?: string }, busy: boolean): Promise<CanvasToolContext> {
  const { project, direction } = await loadTarget(deps, input.projectId, input.directionId);
  if (busy) refuseWhileRunning(deps, project, direction);
  return { canvas: deps.canvas, project, direction, mode: 'edit', plan: false };
}

function probeOf(deps: EditDeps, ctx: CanvasToolContext) {
  if (!deps.preview.withPage) return undefined;
  return probeWithPreview(deps.preview, ctx.project, ctx.direction, (url, selectors) => describeElements(deps.preview, url, selectors));
}

function failed(done: { result: Done['result'] }): Done | null {
  return done.result.isError ? { result: done.result } : null;
}

const listLinksTool = defineTool(
  'list_links',
  z.object({ projectId, directionId, check: z.boolean().optional().describe('Render each page that has links and mark links whose element is gone. Default true.') }).strict(),
  { title: 'List prototype links', description: `List the prototype links of a project: id, frame, selector, target frame (or "back"), transition, and broken (null, or why the link no longer works: the frame or the element is gone, or the frame shows another page). Also returns startFrame. ${LINKS_NOTE}`, readOnly: true, idempotent: true },
  async (deps, input) => {
    const ctx = await contextOf(deps, input, false);
    return { result: await listLinks(ctx, input.check === false ? undefined : probeOf(deps, ctx)) };
  },
);

const addLinkTool = defineTool(
  'add_link',
  z.object({ projectId, directionId, ...linkSpecSchema.shape }).strict(),
  { title: 'Add prototype link', description: `Link an element (CSS selector on the page of fromFrame) to another frame: on click, go to toFrame with a transition (instant, dissolve, slide-left, slide-right). toFrame "back" goes back to the frame before. A second link on the same element replaces the first. The element must exist on the rendered page. ${LINKS_NOTE}` },
  async (deps, input, _client) => {
    const ctx = await contextOf(deps, input, true);
    const done = await addLink(ctx, { fromFrame: input.fromFrame, selector: input.selector, toFrame: input.toFrame, ...(input.transition ? { transition: input.transition } : {}) }, probeOf(deps, ctx));
    const refused = failed(done);
    if (refused || !done.link) return refused ?? { result: done.result };
    return { result: done.result, activity: { projectId: ctx.project.id, directionId: ctx.direction.id, summary: `Linked ${done.title ?? done.link.id}`, frameId: done.link.from.frame } };
  },
);

const removeLinkTool = defineTool(
  'remove_link',
  z.object({ projectId, directionId, linkId: z.string().regex(/^l\d{1,5}$/).describe('Link id from list_links, for example "l2".') }).strict(),
  { title: 'Remove prototype link', description: `Remove one prototype link. The page and the frames stay. ${LINKS_NOTE}`, destructive: true, idempotent: true },
  async (deps, input) => {
    const ctx = await contextOf(deps, input, true);
    const done = await removeLink(ctx, input.linkId);
    const refused = failed(done);
    if (refused) return refused;
    return { result: done.result, activity: { projectId: ctx.project.id, directionId: ctx.direction.id, summary: `Removed link ${done.title ?? input.linkId}` } };
  },
);

const setStartTool = defineTool(
  'set_start_frame',
  z.object({ projectId, directionId, frame: frameRef.describe('Frame id or @label where Play starts.') }).strict(),
  { title: 'Set prototype start frame', description: `Set the frame where Play starts. ${LINKS_NOTE}`, idempotent: true },
  async (deps, input) => {
    const ctx = await contextOf(deps, input, true);
    const done = await setStartFrame(ctx, input.frame);
    const refused = failed(done);
    if (refused) return refused;
    if (!done.frame) throw new EditError(`No frame ${input.frame}.`);
    return { result: done.result, activity: { projectId: ctx.project.id, directionId: ctx.direction.id, summary: `Set the start frame to ${frameLabel(done.frame)}`, frameId: done.frame.id } };
  },
);

export const LINK_TOOLS = [listLinksTool, addLinkTool, removeLinkTool, setStartTool];
