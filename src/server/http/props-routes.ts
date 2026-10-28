import type { Context, Hono } from 'hono';
import { z } from 'zod';
import type { Direction, Project } from '../../shared/contracts.js';
import { OWNERS_MAX, OWNER_STACK_MAX, type InstanceQuery } from '../../shared/props.js';
import { instanceFor, listComponentSchemas } from '../components/props-service.js';
import { DirectEditError, type DirectEditDeps } from '../direct-edit/index.js';
import { applySetProps, applyVariantClasses } from '../direct-edit/props.js';
import { BadRequestError } from '../store/errors.js';
import type { PreviewService } from '../types.js';

interface PropsRouteDeps {
  editDeps: DirectEditDeps;
  preview: PreviewService;
  readBody: (c: Context) => Promise<unknown>;
  loadDirection: (pid: string, did: string) => Promise<{ project: Project; direction: Direction }>;
  withDirection: <T>(pid: string, did: string, task: (project: Project, direction: Direction) => Promise<T>) => Promise<T>;
}

const loc = z.object({ file: z.string().min(1).max(1000), line: z.number().int().min(1), col: z.number().int().min(1) });
const instanceSchema = z.object({
  owners: z.array(z.object({ name: z.string().max(64), stack: z.string().max(OWNER_STACK_MAX) })).max(OWNERS_MAX).optional(),
  usedAt: loc.nullable().optional(),
  use: loc.nullable().optional(),
});

function editError(c: Context, error: unknown): Response {
  if (error instanceof DirectEditError) return c.json({ error: error.code, message: error.message }, error.status);
  throw error;
}

export function registerPropsRoutes(app: Hono, deps: PropsRouteDeps): void {
  app.get('/api/projects/:pid/d/:did/props/components', async (c) => {
    const { direction } = await deps.loadDirection(c.req.param('pid'), c.req.param('did'));
    return c.json(await listComponentSchemas(direction.workTree));
  });

  app.post('/api/projects/:pid/d/:did/props/instance', async (c) => {
    const parsed = instanceSchema.safeParse(await deps.readBody(c));
    if (!parsed.success) throw new BadRequestError('owners, usedAt or use is not valid');
    const { project, direction } = await deps.loadDirection(c.req.param('pid'), c.req.param('did'));
    try {
      return c.json({ instance: await instanceFor(deps.preview, project, direction, parsed.data as InstanceQuery) });
    } catch (error) {
      return editError(c, error);
    }
  });

  app.post('/api/projects/:pid/d/:did/props', async (c) => {
    const body = await deps.readBody(c);
    try {
      return c.json(await deps.withDirection(c.req.param('pid'), c.req.param('did'), (project, direction) => applySetProps(deps.editDeps, project, direction, body)));
    } catch (error) {
      return editError(c, error);
    }
  });

  app.post('/api/projects/:pid/d/:did/props/variant-classes', async (c) => {
    const body = await deps.readBody(c);
    try {
      return c.json(await deps.withDirection(c.req.param('pid'), c.req.param('did'), (project, direction) => applyVariantClasses(deps.editDeps, project, direction, body)));
    } catch (error) {
      return editError(c, error);
    }
  });
}
