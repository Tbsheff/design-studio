import type { Context, Hono } from 'hono';
import { LAYER_LOCK_KEYS_MAX, cleanLockKeys } from '../../shared/layer-locks.js';
import { applyDelta } from '../layers/lock-probe.js';
import { BadRequestError, NotFoundError } from '../store/errors.js';
import { configureLayerLocks, createLayerLockStore } from '../store/layer-locks.js';
import type { StudioProjectStore } from '../store/projects.js';
import type { EventBus } from '../types.js';

interface LayerStateRouteDeps {
  projects: StudioProjectStore;
  bus: EventBus;
  readBody: (c: Context) => Promise<Record<string, unknown>>;
}

export function registerLayerStateRoutes(app: Hono, deps: LayerStateRouteDeps): void {
  const store = createLayerLockStore({ projectDir: (id) => deps.projects.projectDir(id), bus: deps.bus });
  configureLayerLocks(store);

  const direction = async (c: Context) => {
    const project = await deps.projects.get(c.req.param('pid') ?? '');
    const did = c.req.param('did') ?? '';
    if (!project.directions.some((item) => item.id === did)) throw new NotFoundError(`direction ${did} not found`);
    return { pid: project.id, did };
  };

  app.get('/api/projects/:pid/d/:did/layer-locks', async (c) => {
    const { pid, did } = await direction(c);
    return c.json(await store.read(pid, did));
  });

  app.put('/api/projects/:pid/d/:did/layer-locks', async (c) => {
    const { pid, did } = await direction(c);
    const body = await deps.readBody(c);
    const lists = [body.keys, body.add, body.remove].filter((list) => list !== undefined);
    if (lists.length === 0 || !lists.every(Array.isArray)) throw new BadRequestError('pass keys, or add and remove, as arrays of strings');
    if (lists.some((list) => (list as unknown[]).length > LAYER_LOCK_KEYS_MAX)) throw new BadRequestError(`at most ${LAYER_LOCK_KEYS_MAX} locked layers`);
    if (body.keys !== undefined) {
      const keys = cleanLockKeys(body.keys);
      return c.json(await store.write(pid, did, keys));
    }
    const delta = { add: cleanLockKeys(body.add), remove: cleanLockKeys(body.remove) };
    return c.json(await store.update(pid, did, (before) => applyDelta(before, delta)));
  });
}
