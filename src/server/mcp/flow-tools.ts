import { z } from 'zod';
import { buildFlow, configuredFlowDeps, describeFlow, describeRouteLinks, FLOW_NOTE, listRouteLinks } from '../app/route-flow.js';
import { FLOW_MAX_DEPTH } from '../../shared/route-flow.js';
import { EditError, loadTarget, refuseWhileRunning } from './edit-deps.js';
import { defineTool, directionId, projectId } from './edit-kit.js';

const route = z.string().trim().min(1).max(300);

const listRouteLinksTool = defineTool(
  'list_route_links',
  z.object({ projectId, route: route.describe('Route pattern from list_routes ("/organizations/[slug]/patients") or a concrete path ("/organizations/acme/patients").') }).strict(),
  { title: 'List route links', description: `Read only. List the links found in the source of one app route: kind (link, push, form, redirect), href, the route it goes to, the element to click (selector and text) and file:line. ${FLOW_NOTE}`, readOnly: true, idempotent: true },
  async (deps, input) => {
    const { project } = await loadTarget(deps, input.projectId);
    return { result: { content: [{ type: 'text', text: describeRouteLinks(await listRouteLinks(project, input.route)) }] } };
  },
);

const addFlowTool = defineTool(
  'add_flow',
  z
    .object({
      projectId,
      directionId,
      routes: z.array(route).min(1).max(12).optional().describe('Routes to lay out left to right, in order. Links between them become prototype links.'),
      from: route.optional().describe('A route, or a frame id or @label: start there and add the routes it links to.'),
      depth: z.number().int().min(0).max(FLOW_MAX_DEPTH).optional().describe('Link steps to follow from each route. Default 1 with from, 0 with routes.'),
      params: z.record(z.string().regex(/^[A-Za-z_][\w-]{0,40}$/), z.string().max(80)).optional().describe('Sample values for dynamic segments, for example {"slug": "acme", "patientId": "123"}. Saved for the next flow.'),
    })
    .strict(),
  { title: 'Add route flow', description: `Lay out app route frames left to right (the same code as Flow in the studio) and make prototype links from the links in their source. Pass routes, or from with depth. Frames already on the canvas are reused. ${FLOW_NOTE}` },
  async (deps, input) => {
    if (!input.routes && !input.from) throw new EditError('Pass routes or from.');
    const { project, direction } = await loadTarget(deps, input.projectId, input.directionId);
    refuseWhileRunning(deps, project, direction);
    const flowDeps = configuredFlowDeps(deps.canvas);
    if (!flowDeps) throw new EditError('Design Studio is still starting. Try again.');
    const done = await buildFlow(flowDeps, project, direction, { ...(input.routes ? { routes: input.routes } : {}), ...(input.from ? { from: input.from } : {}), ...(input.depth !== undefined ? { depth: input.depth } : {}), ...(input.params ? { params: input.params } : {}) }, 'agent');
    const first = done.frames[0]?.id;
    return {
      result: { content: [{ type: 'text', text: describeFlow(done) }] },
      activity: { projectId: project.id, directionId: direction.id, summary: `Added a flow of ${done.frames.length} frames and ${done.links.length} links`, ...(first ? { frameId: first } : {}) },
    };
  },
);

export const FLOW_TOOLS = [listRouteLinksTool, addFlowTool];
