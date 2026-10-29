import type { Hono } from 'hono';
import { componentUsage } from '../agent/usage-scope.js';
import { BadRequestError, assertSafeId } from '../store/errors.js';
import type { StudioProjectStore } from '../store/projects.js';
import type { PreviewService } from '../types.js';

export interface UsageRouteDeps {
  projects: Pick<StudioProjectStore, 'get' | 'directionOf' | 'mainDirection'>;
  preview?: Pick<PreviewService, 'usageEdges'>;
}

const FILE_MAX = 500;

export function registerUsageRoutes(app: Hono, deps: UsageRouteDeps): void {
  const edges = deps.preview?.usageEdges;
  app.get('/api/projects/:pid/usage', async (c) => {
    const file = c.req.query('file') ?? '';
    if (!file.trim() || file.length > FILE_MAX) throw new BadRequestError('file is required: a source path like components/auth/panel.tsx');
    const project = await deps.projects.get(assertSafeId(c.req.param('pid'), 'projectId'));
    const did = c.req.query('directionId');
    const direction = did ? deps.projects.directionOf(project, assertSafeId(did, 'directionId')) : deps.projects.mainDirection(project);
    return c.json(await componentUsage(project, direction.workTree, file, edges));
  });
}
