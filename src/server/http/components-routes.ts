import type { Hono } from 'hono';
import type { Direction, Project } from '../../shared/contracts.js';
import type { ComponentService } from '../components/thumbs.js';
import { BadRequestError, NotFoundError } from '../store/errors.js';

interface ComponentRouteDeps {
  service: ComponentService;
  loadDirection: (pid: string, did: string) => Promise<{ project: Project; direction: Direction }>;
}

const ID_RE = /^[A-Z][A-Za-z0-9]{0,47}$/;

export function registerComponentRoutes(app: Hono, deps: ComponentRouteDeps): void {
  app.get('/api/projects/:pid/d/:did/components', async (c) => {
    const { project, direction } = await deps.loadDirection(c.req.param('pid'), c.req.param('did'));
    return c.json({ components: await deps.service.list(project, direction) });
  });

  app.get('/api/projects/:pid/d/:did/components/:id/thumb', async (c) => {
    const id = c.req.param('id');
    if (!ID_RE.test(id)) throw new BadRequestError('invalid component id');
    const version = (c.req.query('v') ?? '0').slice(0, 40);
    const { project, direction } = await deps.loadDirection(c.req.param('pid'), c.req.param('did'));
    const png = await deps.service.thumb(project, direction, id, version);
    if (!png) throw new NotFoundError('no thumbnail for this component');
    return c.body(new Uint8Array(png), 200, { 'content-type': 'image/png', 'cache-control': 'private, max-age=3600' });
  });
}
