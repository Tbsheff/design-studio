import type { Context, Hono } from 'hono';
import type { Direction, Project } from '../../shared/contracts.js';
import { applyInsertComponent } from '../components/insert.js';
import { listInsertable } from '../components/insert-list.js';
import { applyClearText, applyInsertJsx } from '../direct-edit/jsx-insert.js';
import { DirectEditError, type DirectEditDeps } from '../direct-edit/index.js';
import { applySetImage } from '../direct-edit/image.js';
import { applyVector } from '../direct-edit/vector-ops.js';
import type { PreviewService } from '../types.js';

interface InsertRouteDeps {
  editDeps: DirectEditDeps;
  preview: PreviewService;
  readBody: (c: Context) => Promise<unknown>;
  loadDirection: (pid: string, did: string) => Promise<{ project: Project; direction: Direction }>;
  withDirection: <T>(pid: string, did: string, task: (project: Project, direction: Direction) => Promise<T>) => Promise<T>;
}

export async function previewOriginOf(preview: PreviewService, project: Project, direction: Direction): Promise<string | null> {
  if (project.kind !== 'react') return null;
  try {
    return new URL(await preview.directionUrl(project, direction)).origin;
  } catch {
    return null;
  }
}

export function registerInsertRoutes(app: Hono, deps: InsertRouteDeps): void {
  app.get('/api/projects/:pid/d/:did/insert/components', async (c) => {
    const { project, direction } = await deps.loadDirection(c.req.param('pid'), c.req.param('did'));
    return c.json(await listInsertable(project, direction.workTree));
  });

  const insertRoute = (route: string, apply: typeof applyInsertComponent | typeof applyInsertJsx | typeof applyClearText | typeof applySetImage | typeof applyVector) =>
    app.post(route, async (c) => {
      const body = await deps.readBody(c);
      try {
        const result = await deps.withDirection(c.req.param('pid') as string, c.req.param('did') as string, async (project, direction) =>
          apply(deps.editDeps, { project, direction, workTree: direction.workTree, previewOrigin: await previewOriginOf(deps.preview, project, direction) }, body),
        );
        return c.json(result);
      } catch (error) {
        if (error instanceof DirectEditError) return c.json({ error: error.code, message: error.message }, error.status);
        throw error;
      }
    });
  insertRoute('/api/projects/:pid/d/:did/insert', applyInsertComponent);
  insertRoute('/api/projects/:pid/d/:did/insert/jsx', applyInsertJsx);
  insertRoute('/api/projects/:pid/d/:did/insert/clear-text', applyClearText);
  insertRoute('/api/projects/:pid/d/:did/image', applySetImage);
  insertRoute('/api/projects/:pid/d/:did/vector', applyVector);
}
