import { z } from 'zod';
import { PORT_FLOW_MAX_PAGES, type PortFlowPlan, type PortPlan } from '../../shared/port.js';
import { studioCall } from './edit-deps.js';
import { PATH_MAX, defineTool, directionId, id, ok, projectId, type ToolSpec } from './edit-kit.js';

const schema = z
  .object({
    projectId: projectId.describe('The prototype project id (an HTML project), from list_projects.'),
    path: z.string().trim().max(PATH_MAX).optional().describe('HTML page in the prototype project, for example "index.html" or "time.html". Leave out for index.html. With flow or paths it is the first page of the flow, which gets the base route.'),
    paths: z.array(z.string().trim().min(1).max(PATH_MAX)).min(1).max(PORT_FLOW_MAX_PAGES).optional().describe('Port these pages of the prototype as one flow, for example ["index.html", "time.html"]. They come back in flow order.'),
    flow: z.boolean().optional().describe('true: follow the links from path (anchors, form actions and page names in scripts) and plan every page of the flow.'),
    directionId,
    targetProjectId: id('The attached app project id to port into (a project made with Open app), from list_projects. Leave out to read the page only.').optional(),
    route: z.string().trim().max(200).optional().describe('The new app route, for example "/classes" or "/(design)/classes" to use a route group layout. Gives the route file and checks that the route is new. With flow or paths it is the base route: the first page gets it and each other page gets <route>/<page name>.'),
  })
  .strict();

export const GET_PORT_PLAN_TEXT =
  'Plan how to move an HTML prototype page into an attached app as one React route, the same plan the studio "Move to app" dialog puts in its run. Returns the page sections, the step list of a flow, repeated blocks (cards) with their headings, headings, actions, images, links, the CSS tokens it uses mapped to the app tokens, counts of inline styles and raw colors, parts to leave out (hidden or absolute decorative elements), and kit: the target app components that fit (Card, Badge, Button and others) with their import line and why. With route it also returns the route file and routeExists. With flow: true or paths it plans a whole flow instead: pages in flow order, each with its route under the base route, route file, routeExists and its own plan; links: the link map from each prototype href (anchor, form or script) to its app path with the query kept; unselected and unreached pages. Read only: it never starts a run; write the routes yourself from the plan with write_file or insert_jsx.';

function planQuery(input: z.infer<typeof schema>): URLSearchParams {
  const query = new URLSearchParams({ sourceProjectId: input.projectId, path: input.path ?? 'index.html' });
  if (input.directionId) query.set('sourceDirectionId', input.directionId);
  if (input.targetProjectId) query.set('targetProjectId', input.targetProjectId);
  if (input.route) query.set('route', input.route);
  if (input.flow) query.set('flow', '1');
  for (const page of input.paths ?? []) query.append('paths', page);
  return query;
}

const getPortPlan = defineTool('get_port_plan', schema, { title: 'Plan a port to the app', description: GET_PORT_PLAN_TEXT, readOnly: true, idempotent: true }, async (deps, input) => {
  const plan = await studioCall<PortPlan | PortFlowPlan>(deps, 'GET', `/api/port/plan?${planQuery(input).toString()}`);
  return { result: ok(plan) };
});

export const PORT_TOOLS: ToolSpec[] = [getPortPlan];
