import { z } from 'zod';
import type { PortPlan } from '../../shared/port.js';
import { studioCall } from './edit-deps.js';
import { PATH_MAX, defineTool, directionId, id, ok, projectId, type ToolSpec } from './edit-kit.js';

const schema = z
  .object({
    projectId: projectId.describe('The prototype project id (an HTML project), from list_projects.'),
    path: z.string().trim().max(PATH_MAX).optional().describe('HTML page in the prototype project, for example "index.html" or "time.html". Leave out for index.html.'),
    directionId,
    targetProjectId: id('The attached app project id to port into (a project made with Open app), from list_projects. Leave out to read the page only.').optional(),
    route: z.string().trim().max(200).optional().describe('The new app route, for example "/classes" or "/(design)/classes" to use a route group layout. Gives the route file and checks that the route is new.'),
  })
  .strict();

export const GET_PORT_PLAN_TEXT =
  'Plan how to move an HTML prototype page into an attached app as one React route, the same plan the studio "Move to app" dialog puts in its run. Returns the page sections, the step list of a flow, repeated blocks (cards) with their headings, headings, actions, images, links, the CSS tokens it uses mapped to the app tokens, counts of inline styles and raw colors, parts to leave out (hidden or absolute decorative elements), and kit: the target app components that fit (Card, Badge, Button and others) with their import line and why. With route it also returns the route file and routeExists. Read only: it never starts a run; write the route yourself from the plan with write_file or insert_jsx.';

const getPortPlan = defineTool('get_port_plan', schema, { title: 'Plan a port to the app', description: GET_PORT_PLAN_TEXT, readOnly: true, idempotent: true }, async (deps, input) => {
  const query = new URLSearchParams({ sourceProjectId: input.projectId, path: input.path ?? 'index.html' });
  if (input.directionId) query.set('sourceDirectionId', input.directionId);
  if (input.targetProjectId) query.set('targetProjectId', input.targetProjectId);
  if (input.route) query.set('route', input.route);
  const plan = await studioCall<PortPlan>(deps, 'GET', `/api/port/plan?${query.toString()}`);
  return { result: ok(plan) };
});

export const PORT_TOOLS: ToolSpec[] = [getPortPlan];
