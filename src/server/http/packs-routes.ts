import type { Context, Hono } from 'hono';
import type { Direction, Project } from '../../shared/contracts.js';
import { DirectEditError } from '../direct-edit/index.js';
import type { PackLibrary } from '../design-system/library.js';
import { packProblems } from '../design-system/packs.js';
import { applyPackToDirection, parseApplyRequest, saveDirectionPack } from '../design-system/project-pack.js';
import type { ProjectPackDeps } from '../design-system/project-pack.js';
import { BadRequestError } from '../store/errors.js';

interface PackRouteDeps {
  library: PackLibrary;
  editDeps: ProjectPackDeps;
  readBody: (c: Context) => Promise<Record<string, unknown>>;
  withDirection: <T>(pid: string, did: string, task: (project: Project, direction: Direction) => Promise<T>) => Promise<T>;
}

function packId(c: Context): string {
  const id = c.req.param('id') ?? '';
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(id)) throw new BadRequestError('invalid pack id');
  return id;
}

export function registerPackRoutes(app: Hono, deps: PackRouteDeps): void {
  const { library, editDeps, readBody, withDirection } = deps;
  const registry = library.registry;

  app.get('/api/packs', async (c) => c.json(await registry.list()));

  app.get('/api/packs/problems', async (c) => c.json(packProblems(await registry.problems())));

  app.post('/api/packs', async (c) => c.json((await library.createUserPack(await readBody(c))).summary));

  app.get('/api/packs/:id', async (c) => c.json(await library.detail(packId(c))));

  app.patch('/api/packs/:id', async (c) => c.json((await library.updateUserPack(packId(c), await readBody(c))).summary));

  app.post('/api/packs/:id/duplicate', async (c) => {
    const body = await readBody(c);
    if (body.name !== undefined && typeof body.name !== 'string') throw new BadRequestError('name must be a string');
    return c.json((await library.duplicatePack(packId(c), body.name as string | undefined)).summary);
  });

  app.delete('/api/packs/:id', async (c) => {
    await library.deletePack(packId(c));
    return c.json({ ok: true });
  });

  app.get('/api/packs/:id/export', async (c) => {
    const { fileName, bytes } = await library.exportPack(packId(c));
    return new Response(new Uint8Array(bytes), {
      headers: {
        'content-type': 'application/zip',
        'content-disposition': `attachment; filename="${fileName}"`,
        'content-length': String(bytes.byteLength),
      },
    });
  });

  app.post('/api/projects/:pid/d/:did/design-system/apply', async (c) => {
    const { packId: id } = parseApplyRequest(await readBody(c));
    const pack = await registry.get(id);
    if (!pack) throw new BadRequestError(`unknown packId: ${id}`);
    try {
      return c.json(await withDirection(c.req.param('pid'), c.req.param('did'), (project, direction) => applyPackToDirection(editDeps, project, direction, pack)));
    } catch (error) {
      if (error instanceof DirectEditError) return c.json({ error: error.code, message: error.message }, error.status);
      throw error;
    }
  });

  app.post('/api/projects/:pid/d/:did/design-system/save', async (c) => {
    const body = await readBody(c);
    try {
      return c.json(await withDirection(c.req.param('pid'), c.req.param('did'), (project, direction) => saveDirectionPack(editDeps, library, project, direction, body)));
    } catch (error) {
      if (error instanceof DirectEditError) return c.json({ error: error.code, message: error.message }, error.status);
      throw error;
    }
  });
}
