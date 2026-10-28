import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Context, Hono } from 'hono';
import type { Direction, EditSessionEnd, EditSessionState, Project, VersionMeta } from '../../shared/contracts.js';
import { elementClassInfo } from '../direct-edit/class-info.js';
import { htmlElementSpan } from '../direct-edit/html.js';
import { DirectEditError, assertCanEdit, publishVersion, resolveSource, type DirectEditDeps } from '../direct-edit/index.js';
import { jsxElementSpan } from '../direct-edit/jsx.js';
import type { EditHistory, HistoryStep } from '../direct-edit/history.js';
import { BadRequestError, ConflictError, assertSafeId } from '../store/errors.js';
import type { StudioProjectStore } from '../store/projects.js';

interface EditHistoryRouteDeps {
  history: EditHistory;
  editDeps: DirectEditDeps;
  projects: Pick<StudioProjectStore, 'get' | 'mainDirection'>;
  withDirection: <T>(pid: string, did: string, task: (project: Project, direction: Direction) => Promise<T>) => Promise<T>;
  readBody: (c: Context) => Promise<unknown>;
  loadDirection: (pid: string, did: string) => Promise<{ project: Project; direction: Direction }>;
  onRestored?: (workTree: string, relatives: string[]) => void;
  onRemapped?: (projectId: string, remapped: Record<string, { id: string; parentId: string }>) => void;
}

const SHA = /^[0-9a-f]{40}$/;
const MAX_LISTED = 12;
const MAX_SNIPPET = 20_000;

interface ElementSource {
  file: string;
  line: number;
  code: string | null;
}

function dedent(text: string): string {
  const lines = text.split('\n');
  const widths = lines.filter((line) => line.trim() !== '').map((line) => /^[ \t]*/.exec(line)?.[0].length ?? 0);
  const cut = widths.length > 0 ? Math.min(...widths) : 0;
  return lines.map((line) => line.slice(Math.min(cut, /^[ \t]*/.exec(line)?.[0].length ?? 0))).join('\n');
}

function baseOf(raw: unknown): string {
  if (typeof raw !== 'string' || !SHA.test(raw)) throw new BadRequestError('baseVersionId must be a version id');
  return raw;
}

function sessionTitle(titles: string[]): string {
  if (titles.length === 1) return titles[0] ?? 'Edit';
  return `Edit session: ${titles.length} edits`;
}

function sessionMeta(titles: string[]): VersionMeta {
  const listed = titles.slice(0, MAX_LISTED).join('; ');
  const more = titles.length > MAX_LISTED ? ` (+${titles.length - MAX_LISTED} more)` : '';
  return { kind: 'manual', prompt: `Edit session: ${listed}${more}` };
}

export function registerEditHistoryRoutes(app: Hono, deps: EditHistoryRouteDeps): void {
  const { history, editDeps, projects, withDirection } = deps;

  app.get('/api/projects/:pid/edit-history', async (c) => {
    const project = await projects.get(c.req.param('pid'));
    const raw = c.req.query('did');
    const directionId = raw === undefined ? projects.mainDirection(project).id : assertSafeId(raw, 'directionId');
    return c.json(history.state(project.id, directionId));
  });

  app.get('/api/projects/:pid/d/:did/edit-history/list', async (c) => {
    const { project, direction } = await deps.loadDirection(c.req.param('pid'), c.req.param('did'));
    const limit = Math.min(50, Math.max(1, Number.parseInt(c.req.query('limit') ?? '20', 10) || 20));
    return c.json({ ...history.state(project.id, direction.id), ...(history.list?.(project.id, direction.id, limit) ?? { undo: [], redo: [] }) });
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

  app.get('/api/projects/:pid/d/:did/edit-session', async (c) => {
    const raw = c.req.query('base');
    const { project, direction } = await deps.loadDirection(c.req.param('pid'), c.req.param('did'));
    const state = await (async (): Promise<EditSessionState> => {
      const base = raw === undefined ? direction.headVersionId : baseOf(raw);
      if (base === null) return { baseVersionId: '', count: 0, dirty: false, blocked: 'This direction has no saved version yet.' };
      const span = editDeps.versions.sessionSince ? await editDeps.versions.sessionSince(project, direction, base) : null;
      return { baseVersionId: base, count: span?.count ?? 0, dirty: span?.dirty ?? false, blocked: span?.foreign ?? null, outside: span?.outside ?? 0 };
    })();
    return c.json(state);
  });

  const endRoute = (action: 'save' | 'discard') => async (c: Context) => {
    const body = (await deps.readBody(c)) as { baseVersionId?: unknown } | null;
    const base = baseOf(body?.baseVersionId);
    try {
      const result = await withDirection(c.req.param('pid') ?? '', c.req.param('did') ?? '', async (project, direction): Promise<EditSessionEnd> => {
        const store = editDeps.versions;
        if (!store.sessionSince || !store.endSession) throw new BadRequestError('Edit sessions are not supported');
        assertCanEdit(editDeps, project, direction);
        const span = await store.sessionSince(project, direction, base);
        if (span.foreign !== null) {
          if (action === 'discard') throw new ConflictError(span.foreign);
          return { version: null, headVersionId: direction.headVersionId ?? base };
        }
        const ended = await store.endSession(project, direction, base, action, sessionTitle(span.titles), sessionMeta(span.titles));
        if (ended.version) {
          await publishVersion(editDeps, project, direction, ended.version);
        } else if (ended.head !== direction.headVersionId) {
          const updated = await editDeps.projects.updateDirection(project.id, direction.id, { headVersionId: ended.head });
          editDeps.bus.emit({ type: 'direction.updated', projectId: project.id, directionId: direction.id, direction: updated });
          const status = await store.status(project, direction);
          editDeps.bus.emit({ type: 'status.changed', projectId: project.id, directionId: direction.id, status });
        }
        if (action === 'discard' && ended.changed.length > 0) deps.onRestored?.(direction.workTree, ended.changed);
        if (ended.remapped) deps.onRemapped?.(project.id, ended.remapped);
        if (span.count > 0) {
          history.forget(project.id, direction.id);
          editDeps.bus.emit({ type: 'versions.changed', projectId: project.id, directionId: direction.id });
        }
        return { version: ended.version, headVersionId: ended.head };
      });
      return c.json(result);
    } catch (error) {
      if (error instanceof DirectEditError) return c.json({ error: error.code, message: error.message }, error.status);
      throw error;
    }
  };

  app.get('/api/projects/:pid/d/:did/source', async (c) => {
    const file = c.req.query('file') ?? '';
    const line = Number(c.req.query('line'));
    const col = Number(c.req.query('col'));
    if (!Number.isInteger(line) || line < 1 || !Number.isInteger(col) || col < 1) throw new BadRequestError('line and col must be positive whole numbers');
    const read = deps.loadDirection(c.req.param('pid'), c.req.param('did')).then(async ({ direction }): Promise<ElementSource> => {
      const target = await resolveSource(direction.workTree, file);
      const code = await readFile(target.file, 'utf8');
      const extension = path.extname(target.relative).toLowerCase();
      const loc = { line, col };
      const span = extension === '.html' || extension === '.htm' ? htmlElementSpan(code, loc) : jsxElementSpan(code, loc, extension === '.tsx');
      if (!span) return { file: target.relative, line, code: null };
      const lineStart = code.lastIndexOf('\n', span.start - 1) + 1;
      const indent = /^[ \t]*/.exec(code.slice(lineStart, span.start))?.[0] ?? '';
      const text = indent + code.slice(span.start, Math.min(span.end, span.start + MAX_SNIPPET));
      return { file: target.relative, line, code: dedent(text) };
    });
    try {
      return c.json(await read);
    } catch (error) {
      if (error instanceof DirectEditError) return c.json({ error: error.code, message: error.message }, error.status);
      throw error;
    }
  });

  app.get('/api/projects/:pid/d/:did/classes', async (c) => {
    const file = c.req.query('file') ?? '';
    const line = Number(c.req.query('line'));
    const col = Number(c.req.query('col'));
    if (!Number.isInteger(line) || line < 1 || !Number.isInteger(col) || col < 1) throw new BadRequestError('line and col must be positive whole numbers');
    try {
      const { project, direction } = await deps.loadDirection(c.req.param('pid'), c.req.param('did'));
      return c.json(await elementClassInfo(direction.workTree, project.kind, { file, line, col }, c.req.query('variant') ?? ''));
    } catch (error) {
      if (error instanceof DirectEditError) return c.json({ error: error.code, message: error.message }, error.status);
      throw error;
    }
  });

  app.post('/api/projects/:pid/d/:did/edit-session/save', endRoute('save'));
  app.post('/api/projects/:pid/d/:did/edit-session/discard', endRoute('discard'));
}
