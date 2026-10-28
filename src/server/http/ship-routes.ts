import path from 'node:path';
import type { Context, Hono } from 'hono';
import { SHIP_MODES, SHIP_TEXT_MAX, type ShipMode, type ShipRequest } from '../../shared/ship.js';
import { prepareShip } from '../git/ship-prepare.js';
import { readShipState, saveShipSettings, shipSettingsSchema } from '../git/ship-store.js';
import { ship } from '../git/ship.js';
import type { ActivityLog } from '../mcp/activity.js';
import { BadRequestError, assertSafeId } from '../store/errors.js';
import type { StudioProjectStore } from '../store/projects.js';
import type { AgentRunner } from '../types.js';

export interface ShipRouteDeps {
  projects: StudioProjectStore;
  runner: AgentRunner;
  dataDir: string;
  activity: ActivityLog;
  readBody: (c: Context) => Promise<Record<string, unknown>>;
}

const text = (body: Record<string, unknown>, key: string): string => {
  const value = body[key] ?? '';
  if (typeof value !== 'string') throw new BadRequestError(`${key} must be a string`);
  return value;
};

function shipRequest(body: Record<string, unknown>): ShipRequest {
  const files = body.files;
  if (!Array.isArray(files) || files.length > 500 || files.some((file) => typeof file !== 'string' || file.length > 1000)) throw new BadRequestError('files must be a list of paths');
  const mode = body.mode as ShipMode;
  if (!SHIP_MODES.includes(mode)) throw new BadRequestError('mode must be branch, push or pr');
  const client = typeof body.client === 'string' ? body.client.slice(0, 40) : undefined;
  return { baseVersionId: text(body, 'baseVersionId'), headVersionId: text(body, 'headVersionId'), files: files as string[], branch: text(body, 'branch'), commitMessage: text(body, 'commitMessage'), title: text(body, 'title'), body: text(body, 'body'), mode, ...(client ? { client } : {}) };
}

export function registerShipRoutes(app: Hono, deps: ShipRouteDeps): void {
  const projectDir = (pid: string) => path.join(deps.dataDir, 'projects', assertSafeId(pid, 'projectId'));

  app.get('/api/projects/:pid/ship', async (c) => {
    const project = await deps.projects.get(c.req.param('pid'));
    return c.json(await prepareShip({ projectDir: projectDir(project.id), project }, c.req.query('base') || undefined, { title: c.req.query('title')?.slice(0, SHIP_TEXT_MAX.title) }));
  });

  app.post('/api/projects/:pid/ship', async (c) => {
    const project = await deps.projects.get(c.req.param('pid'));
    const request = shipRequest(await deps.readBody(c));
    const main = deps.projects.mainDirection(project);
    const result = await ship({ projectDir: projectDir(project.id), project, dataDir: deps.dataDir, running: deps.runner.isRunning(project.id, main.id) }, request);
    const where = result.prUrl ? `, PR ${result.prUrl}` : result.pushed ? `, pushed to ${result.remote ?? 'remote'}` : '';
    await deps.activity.record('ship', request.client ?? 'You', { projectId: project.id, directionId: main.id, summary: `Shipped ${result.files.length} file${result.files.length === 1 ? '' : 's'} as ${result.branch} (${result.sha.slice(0, 7)})${where}` });
    return c.json(result);
  });

  app.get('/api/projects/:pid/ship/settings', async (c) => {
    const project = await deps.projects.get(c.req.param('pid'));
    return c.json((await readShipState(projectDir(project.id))).settings);
  });

  app.put('/api/projects/:pid/ship/settings', async (c) => {
    const project = await deps.projects.get(c.req.param('pid'));
    const parsed = shipSettingsSchema.safeParse(await deps.readBody(c));
    if (!parsed.success) throw new BadRequestError(parsed.error.issues[0]?.message ?? 'settings are not valid');
    return c.json(await saveShipSettings(projectDir(project.id), parsed.data));
  });
}
