import type { Hono } from 'hono';
import type { Direction, Project } from '../../shared/contracts.js';
import { loadRepoContext } from '../agent/repo-context.js';

export interface RunContextRouteDeps {
  loadDirection: (pid: string, did: string) => Promise<{ project: Project; direction: Direction }>;
}

export function registerRunContextRoutes(app: Hono, deps: RunContextRouteDeps): void {
  app.get('/api/projects/:pid/d/:did/run-context', async (c) => {
    const { project, direction } = await deps.loadDirection(c.req.param('pid'), c.req.param('did'));
    return c.json(await loadRepoContext(project, direction.workTree));
  });
}
