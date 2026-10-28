import type { Hono } from 'hono';
import type { Direction, Project } from '../../shared/contracts.js';
import { COMPONENT_PREVIEW_PROPS_HEADER } from '../../shared/component-preview.js';
import { PreviewTargetError, type ComponentPreviews } from '../components/preview.js';
import { BadRequestError, NotFoundError } from '../store/errors.js';

interface ComponentPreviewRouteDeps {
  previews: ComponentPreviews;
  loadDirection: (pid: string, did: string) => Promise<{ project: Project; direction: Direction }>;
}

const NAME_RE = /^[A-Z][A-Za-z0-9_$]{0,63}$/;
const TEXT_MAX = 1000;

function targetOf(query: (key: string) => string | undefined): { id?: string; name?: string; file?: string } {
  const id = query('id');
  const name = query('name');
  const file = query('file');
  if (id) {
    if (id.length > TEXT_MAX || id.includes('\0')) throw new BadRequestError('invalid component id');
    return { id };
  }
  if (!name || !NAME_RE.test(name)) throw new BadRequestError('pass id, or name (and file)');
  if (file && (file.length > TEXT_MAX || file.includes('\0'))) throw new BadRequestError('invalid file');
  return { name, ...(file ? { file } : {}) };
}

export function registerComponentPreviewRoutes(app: Hono, deps: ComponentPreviewRouteDeps): void {
  app.get('/api/projects/:pid/d/:did/component-preview', async (c) => {
    const target = targetOf((key) => c.req.query(key));
    const { project, direction } = await deps.loadDirection(c.req.param('pid'), c.req.param('did'));
    let result;
    try {
      result = await deps.previews.render(project, direction, target);
    } catch (error) {
      if (error instanceof PreviewTargetError) throw new NotFoundError(error.message);
      throw error;
    }
    if (!result.ok) return c.json({ error: 'no-preview', message: result.reason, component: result.component }, 422);
    const etag = `"${result.hash}"`;
    if (c.req.header('if-none-match') === etag) return c.body(null, 304, { etag, 'cache-control': 'private, no-cache' });
    const meta = encodeURIComponent(JSON.stringify({ component: result.component, props: result.props, text: result.text, cached: result.cached }));
    return c.body(new Uint8Array(result.png), 200, { 'content-type': 'image/png', 'cache-control': 'private, no-cache', etag, [COMPONENT_PREVIEW_PROPS_HEADER]: meta });
  });
}
