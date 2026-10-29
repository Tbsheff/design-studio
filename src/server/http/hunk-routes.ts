import type { Context, Hono } from 'hono';
import type { Direction, Project } from '../../shared/contracts.js';
import type { HunkRevertRequest } from '../../shared/hunk.js';
import { DirectEditError, type DirectEditDeps } from '../direct-edit/index.js';
import { BadRequestError } from '../store/errors.js';
import { HunkStaleError, revertHunk } from '../store/version-hunk.js';

interface HunkRouteDeps {
  editDeps: DirectEditDeps;
  withDirection: <T>(pid: string, did: string, task: (project: Project, direction: Direction) => Promise<T>) => Promise<T>;
  readBody: (c: Context) => Promise<unknown>;
}

const SHA = /^[0-9a-f]{40}$/;
const FILE_MAX = 300;
const HUNK_MAX = 10_000;

function versionId(raw: unknown, label: string): string {
  if (typeof raw !== 'string' || !SHA.test(raw)) throw new BadRequestError(`${label} must be a version id`);
  return raw;
}

export function parseHunkRequest(raw: unknown): HunkRevertRequest {
  const body = (raw ?? {}) as Record<string, unknown>;
  const file = typeof body.file === 'string' ? body.file.trim() : '';
  if (file === '' || file.length > FILE_MAX) throw new BadRequestError('file must be a project-relative path');
  const hunk = body.hunk;
  if (typeof hunk !== 'number' || !Number.isInteger(hunk) || hunk < 1 || hunk > HUNK_MAX) throw new BadRequestError('hunk must be a whole number from 1');
  const from = body.from === undefined || body.from === null ? undefined : versionId(body.from, 'from');
  return { to: versionId(body.to, 'to'), file, hunk, ...(from ? { from } : {}) };
}

export function registerHunkRoutes(app: Hono, deps: HunkRouteDeps): void {
  app.post('/api/projects/:pid/d/:did/hunks/revert', async (c) => {
    const request = parseHunkRequest(await deps.readBody(c));
    try {
      return c.json(await deps.withDirection(c.req.param('pid'), c.req.param('did'), (project, direction) => revertHunk(deps.editDeps, project, direction, request)));
    } catch (error) {
      if (error instanceof HunkStaleError) return c.json({ error: error.message, code: 'hunk_stale' }, 409);
      if (error instanceof DirectEditError) return c.json({ error: error.code, message: error.message }, error.status);
      throw error;
    }
  });
}
