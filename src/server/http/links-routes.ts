import type { Context, Hono } from 'hono';
import { isFrameId } from '../../shared/canvas-file.js';
import { isLinkId, isLinkTransition, parseLink, upsertLink, type LinkTarget, type PrototypeLink } from '../../shared/links.js';
import type { CanvasService } from '../canvas/service.js';
import { BadRequestError, NotFoundError } from '../store/errors.js';
import type { StudioProjectStore } from '../store/projects.js';

interface LinksRouteDeps {
  projects: StudioProjectStore;
  canvas: CanvasService;
  readBody: (c: Context) => Promise<Record<string, unknown>>;
}

function targetOf(raw: unknown): LinkTarget | null {
  if (!raw || typeof raw !== 'object') return null;
  const target = raw as Record<string, unknown>;
  if (target.back === true) return { back: true };
  return isFrameId(target.frame) ? { frame: target.frame } : null;
}

export function registerLinksRoutes(app: Hono, deps: LinksRouteDeps): void {
  const { projects, canvas, readBody } = deps;
  const linkId = (c: Context): string => {
    const id = c.req.param('lid');
    if (!isLinkId(id)) throw new BadRequestError('invalid link id');
    return id;
  };

  app.get('/api/projects/:pid/links', async (c) => {
    const project = await projects.get(c.req.param('pid'));
    return c.json({ links: await canvas.links.read(project) });
  });

  app.post('/api/projects/:pid/links', async (c) => {
    const body = await readBody(c);
    const project = await projects.get(c.req.param('pid'));
    const parsed = parseLink({ ...body, id: 'l1' });
    if (!parsed) throw new BadRequestError('link needs from {frame, path, selector}, to {frame} or {back: true} and a transition');
    if (!('back' in parsed.to) && parsed.to.frame === parsed.from.frame) throw new BadRequestError('a link goes to another frame');
    let saved: PrototypeLink | null = null;
    const links = await canvas.links.update(
      project,
      (file) => {
        const next = upsertLink(file, { from: parsed.from, to: parsed.to, transition: parsed.transition });
        saved = next.link;
        return next.file;
      },
      'user',
    );
    return c.json({ links, link: saved });
  });

  app.patch('/api/projects/:pid/links/:lid', async (c) => {
    const body = await readBody(c);
    const project = await projects.get(c.req.param('pid'));
    const id = linkId(c);
    const to = body.to === undefined ? undefined : targetOf(body.to);
    if (to === null) throw new BadRequestError('to must be {frame} or {back: true}');
    if (body.transition !== undefined && !isLinkTransition(body.transition)) throw new BadRequestError('unknown transition');
    let found = false;
    const links = await canvas.links.update(
      project,
      (file) => {
        found = file.links.some((link) => link.id === id);
        if (!found) return null;
        return {
          ...file,
          links: file.links.map((link) => (link.id !== id ? link : { ...link, ...(to ? { to } : {}), ...(isLinkTransition(body.transition) ? { transition: body.transition } : {}) })),
        };
      },
      'user',
    );
    if (!found) throw new NotFoundError('link not found');
    return c.json({ links });
  });

  app.delete('/api/projects/:pid/links/:lid', async (c) => {
    const project = await projects.get(c.req.param('pid'));
    const id = linkId(c);
    const links = await canvas.links.update(project, (file) => (file.links.some((link) => link.id === id) ? { ...file, links: file.links.filter((link) => link.id !== id) } : null), 'user');
    return c.json({ links });
  });

  app.put('/api/projects/:pid/links/start', async (c) => {
    const body = await readBody(c);
    const project = await projects.get(c.req.param('pid'));
    if (!isFrameId(body.frame)) throw new BadRequestError('frame must be a frame id');
    const frame = body.frame;
    const links = await canvas.links.update(project, (file) => ({ ...file, start: frame }), 'user');
    return c.json({ links });
  });
}
