import type { Context, Hono } from 'hono';
import type { Direction, Project } from '../../shared/contracts.js';
import { DirectEditError, type DirectEditDeps } from '../direct-edit/index.js';
import type { EditHistory, HistoryStep } from '../direct-edit/history.js';
import { assertSafeId } from '../store/errors.js';
import type { StudioProjectStore } from '../store/projects.js';

interface EditHistoryRouteDeps {
  history: EditHistory;
  editDeps: DirectEditDeps;
  projects: Pick<StudioProjectStore, 'get' | 'mainDirection'>;
  withDirection: <T>(pid: string, did: string, task: (project: Project, direction: Direction) => Promise<T>) => Promise<T>;
}

export function registerEditHistoryRoutes(app: Hono, deps: EditHistoryRouteDeps): void {
  const { history, editDeps, projects, withDirection } = deps;

  app.get('/api/projects/:pid/edit-history', async (c) => {
    const project = await projects.get(c.req.param('pid'));
    const raw = c.req.query('did');
    const directionId = raw === undefined ? projects.mainDirection(project).id : assertSafeId(raw, 'directionId');
    return c.json(history.state(project.id, directionId));
  });

  const stepRoute = (kind: HistoryStep) => async (c: Context) => {
    try {
      const result = await withDirection(c.req.param('pid') ?? '', c.req.param('did') ?? '', (project, direction) => history.step(kind, editDeps, project, direction));
      return c.json(result);
    } catch (error) {
      if (error instanceof DirectEditError) return c.json({ error: error.code, message: error.message }, error.status);
      throw error;
    }
  };

  app.post('/api/projects/:pid/d/:did/edit-history/undo', stepRoute('undo'));
  app.post('/api/projects/:pid/d/:did/edit-history/redo', stepRoute('redo'));
}
