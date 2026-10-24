import type { Context, Hono } from 'hono';
import type { StudioProjectStore } from '../store/projects.js';
import { parseVersionName, type VersionNames } from '../store/version-names.js';
import type { ThumbnailService } from '../thumbnails.js';
import type { VersionStore } from '../types.js';

interface VersionRouteDeps {
  projects: StudioProjectStore;
  versions: VersionStore;
  thumbnails: ThumbnailService;
  names: VersionNames;
  readBody: (c: Context) => Promise<Record<string, unknown>>;
}

const png = (bytes: Buffer, headers: Record<string, string> = {}): Response =>
  new Response(new Uint8Array(bytes), { headers: { 'content-type': 'image/png', 'cache-control': 'private, max-age=31536000, immutable', ...headers } });

const gone = (error: unknown): Response => {
  if (error instanceof Error && error.name === 'AbortError') return new Response(null, { status: 499 });
  throw error;
};

export function registerVersionRoutes(app: Hono, deps: VersionRouteDeps): void {
  const { projects, versions, thumbnails, names, readBody } = deps;

  app.get('/api/projects/:pid/versions/:vid/thumb', async (c) => thumbnails.version(c.req.param('pid'), c.req.param('vid'), c.req.raw.signal).then((bytes) => png(bytes), gone));

  app.get('/api/projects/:pid/versions/:vid/diff/:other', async (c) => {
    const viewport = { width: Number(c.req.query('w') ?? 1280), height: Number(c.req.query('h') ?? 800) };
    return thumbnails.diff(c.req.param('pid'), c.req.param('vid'), c.req.param('other'), viewport, c.req.raw.signal).then((result) => png(result.png, { 'x-changed-pct': String(result.changedPct) }), gone);
  });

  app.patch('/api/projects/:pid/versions/:vid', async (c) => {
    const body = await readBody(c);
    const name = parseVersionName(body.name);
    const project = await projects.get(c.req.param('pid'));
    const version = await versions.get(project, c.req.param('vid'));
    return c.json({ id: version.id, name: await names.set(project.id, version.id, name) });
  });
}
