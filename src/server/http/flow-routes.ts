import type { Context, Hono } from 'hono';
import { configuredFrameStates } from '../app/frame-state-service.js';
import { buildFlow, listRouteLinks, readFlowParams, type FlowDeps } from '../app/route-flow.js';
import { cleanParams, type FlowInput } from '../../shared/route-flow.js';
import type { CanvasService } from '../canvas/service.js';
import { BadRequestError } from '../store/errors.js';
import type { StudioProjectStore } from '../store/projects.js';

interface FlowRouteDeps {
  projects: StudioProjectStore;
  canvas: CanvasService;
  readBody: (c: Context) => Promise<Record<string, unknown>>;
}

export function flowInputOf(body: Record<string, unknown>): FlowInput {
  const routes = Array.isArray(body.routes) ? body.routes.filter((item): item is string => typeof item === 'string').slice(0, 24) : undefined;
  const from = typeof body.from === 'string' ? body.from : undefined;
  if (!from && (!routes || routes.length === 0)) throw new BadRequestError('pass routes or from');
  return {
    ...(routes && routes.length > 0 ? { routes } : {}),
    ...(from ? { from } : {}),
    ...(typeof body.depth === 'number' && Number.isFinite(body.depth) ? { depth: Math.round(body.depth) } : {}),
    ...(body.params !== undefined ? { params: cleanParams(body.params) } : {}),
  };
}

export function registerFlowRoutes(app: Hono, deps: FlowRouteDeps): void {
  const { projects, canvas, readBody } = deps;
  const flowDeps = (): FlowDeps => ({ canvas, projectDir: (id) => projects.projectDir(id), frameStates: configuredFrameStates() });

  app.get('/api/projects/:pid/flow/links', async (c) => {
    const project = await projects.get(c.req.param('pid'));
    const route = c.req.query('route');
    if (!route) throw new BadRequestError('route is required');
    return c.json(await listRouteLinks(project, route));
  });

  app.get('/api/projects/:pid/flow/params', async (c) => {
    const project = await projects.get(c.req.param('pid'));
    return c.json({ params: await readFlowParams(flowDeps(), project) });
  });

  app.post('/api/projects/:pid/flow', async (c) => {
    const project = await projects.get(c.req.param('pid'));
    const direction = canvas.ownerOf(project);
    return c.json(await buildFlow(flowDeps(), project, direction, flowInputOf(await readBody(c)), 'user'));
  });
}
