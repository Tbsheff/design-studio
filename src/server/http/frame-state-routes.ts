import type { Context, Hono } from 'hono';
import { applyFrameSession, applyFrameState, configureFrameStates, readFrameStates, type FrameStateDeps } from '../app/frame-state-service.js';
import { BadRequestError } from '../store/errors.js';
import type { StudioProjectStore } from '../store/projects.js';

interface FrameStateRouteDeps extends Omit<FrameStateDeps, 'projectDir'> {
  projects: StudioProjectStore;
  readBody: (c: Context) => Promise<Record<string, unknown>>;
}

function mockOf(raw: unknown): { name?: string; rules?: unknown[]; signedIn?: boolean } | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw !== 'object') throw new BadRequestError('mock must be an object');
  const mock = raw as Record<string, unknown>;
  return {
    ...(typeof mock.name === 'string' ? { name: mock.name } : {}),
    ...(Array.isArray(mock.rules) ? { rules: mock.rules } : {}),
    ...(typeof mock.signedIn === 'boolean' ? { signedIn: mock.signedIn } : {}),
  };
}

export function registerFrameStateRoutes(app: Hono, deps: FrameStateRouteDeps): void {
  const { projects, readBody } = deps;
  const stateDeps: FrameStateDeps = { projectDir: (id) => projects.projectDir(id), bus: deps.bus, canvas: deps.canvas };
  configureFrameStates(stateDeps);

  app.get('/api/projects/:pid/frame-states', async (c) => {
    const project = await projects.get(c.req.param('pid'));
    return c.json(await readFrameStates(stateDeps, project));
  });

  app.put('/api/projects/:pid/frame-states/frames/:frame', async (c) => {
    const body = await readBody(c);
    const project = await projects.get(c.req.param('pid'));
    if (typeof body.state !== 'string') throw new BadRequestError('state is required');
    const mock = mockOf(body.mock);
    const done = await applyFrameState(stateDeps, project, { frame: c.req.param('frame'), state: body.state, ...(mock ? { mock } : {}) });
    return c.json(done);
  });

  app.patch('/api/projects/:pid/frame-states/session', async (c) => {
    const body = await readBody(c);
    const project = await projects.get(c.req.param('pid'));
    return c.json(await applyFrameSession(stateDeps, project, { ...(body.user !== undefined ? { user: body.user } : {}), ...(body.forget === true ? { forget: true } : {}) }));
  });
}
