import type { Context, Hono } from 'hono';
import { z } from 'zod';
import type { Direction, Project } from '../../shared/contracts.js';
import { applyCreateComponent, componentFolders } from '../components/extract.js';
import { applySwap, swapCandidates } from '../components/swap.js';
import { DirectEditError, type DirectEditDeps } from '../direct-edit/index.js';
import { BadRequestError } from '../store/errors.js';
import type { PreviewService } from '../types.js';
import { previewOriginOf } from './insert-routes.js';

interface ComponentCreateRouteDeps {
  editDeps: DirectEditDeps;
  preview: PreviewService;
  readBody: (c: Context) => Promise<unknown>;
  loadDirection: (pid: string, did: string) => Promise<{ project: Project; direction: Direction }>;
  withDirection: <T>(pid: string, did: string, task: (project: Project, direction: Direction) => Promise<T>) => Promise<T>;
}

const useSchema = z.object({ use: z.object({ file: z.string().min(1).max(1000), line: z.number().int().min(1), col: z.number().int().min(1) }).strict() }).strict();

function editError(c: Context, error: unknown): Response {
  if (error instanceof DirectEditError) return c.json({ error: error.code, message: error.message }, error.status);
  throw error;
}

export function registerComponentCreateRoutes(app: Hono, deps: ComponentCreateRouteDeps): void {
  app.get('/api/projects/:pid/d/:did/components/folders', async (c) => {
    const { project, direction } = await deps.loadDirection(c.req.param('pid'), c.req.param('did'));
    return c.json(await componentFolders(project, direction.workTree));
  });

  app.post('/api/projects/:pid/d/:did/components/swap-candidates', async (c) => {
    const parsed = useSchema.safeParse(await deps.readBody(c));
    if (!parsed.success) throw new BadRequestError('use must be { file, line, col }');
    const { project, direction } = await deps.loadDirection(c.req.param('pid'), c.req.param('did'));
    try {
      return c.json(await swapCandidates(project, direction.workTree, parsed.data.use));
    } catch (error) {
      return editError(c, error);
    }
  });

  const editRoute = (route: string, apply: typeof applyCreateComponent | typeof applySwap) =>
    app.post(route, async (c) => {
      const body = await deps.readBody(c);
      try {
        const result = await deps.withDirection(c.req.param('pid') as string, c.req.param('did') as string, async (project, direction) =>
          apply(deps.editDeps, { project, direction, workTree: direction.workTree, previewOrigin: await previewOriginOf(deps.preview, project, direction) }, body),
        );
        return c.json(result);
      } catch (error) {
        return editError(c, error);
      }
    });
  editRoute('/api/projects/:pid/d/:did/components/create', applyCreateComponent);
  editRoute('/api/projects/:pid/d/:did/components/swap', applySwap);
}
