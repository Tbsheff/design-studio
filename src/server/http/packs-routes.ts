import type { Context, Hono } from 'hono';
import type { Direction, Project } from '../../shared/contracts.js';
import { DirectEditError } from '../direct-edit/index.js';
import type { PackLibrary } from '../design-system/library.js';
import { packProblems } from '../design-system/packs.js';
import { MAX_IMPORT_ZIP_BYTES, PackExistsError, parseImportMode } from '../design-system/pack-import.js';
import { applyPackToDirection, parseApplyRequest, saveDirectionPack } from '../design-system/project-pack.js';
import type { ProjectPackDeps } from '../design-system/project-pack.js';
import { BadRequestError } from '../store/errors.js';

interface PackRouteDeps {
  library: PackLibrary;
  editDeps: ProjectPackDeps;
  readBody: (c: Context) => Promise<Record<string, unknown>>;
  withDirection: <T>(pid: string, did: string, task: (project: Project, direction: Direction) => Promise<T>) => Promise<T>;
}

const FORM_OVERHEAD_BYTES = 64 * 1024;

async function readImportForm(c: Context): Promise<{ bytes: Buffer; mode: unknown }> {
  if (!(c.req.header('content-type') ?? '').toLowerCase().startsWith('multipart/form-data')) throw new BadRequestError('send the zip as multipart/form-data with a file field');
  const length = Number(c.req.header('content-length') ?? '0');
  if (length > MAX_IMPORT_ZIP_BYTES + FORM_OVERHEAD_BYTES) throw new BadRequestError('the zip is larger than 2 MB');
  const form = await c.req.parseBody();
  const file = form.file;
  if (!(file instanceof File)) throw new BadRequestError('add a .zip file in the file field');
  if (file.size > MAX_IMPORT_ZIP_BYTES) throw new BadRequestError('the zip is larger than 2 MB');
  return { bytes: Buffer.from(await file.arrayBuffer()), mode: form.mode };
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

  app.post('/api/packs/import', async (c) => {
    const { bytes, mode } = await readImportForm(c);
    try {
      const { pack, replaced } = await library.importPack(bytes, parseImportMode(mode));
      return c.json({ pack: pack.summary, replaced });
    } catch (error) {
      if (error instanceof PackExistsError) return c.json({ error: 'pack_exists', message: error.message, existing: error.existing }, 409);
      throw error;
    }
  });

  app.get('/api/packs/:id', async (c) => c.json(await library.detail(packId(c))));

  app.get('/api/packs/:id/check', async (c) => c.json(await library.checkPack(packId(c))));

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
