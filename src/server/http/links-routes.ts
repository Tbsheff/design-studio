import type { Context, Hono } from 'hono';
import { isFrameId } from '../../shared/canvas-file.js';
import { isImplicitId, isLinkAction, isLinkEasing, isLinkId, isLinkTransition, motionOf, parseLink, upsertLink, withMotion, type LinkTarget, type PrototypeLink } from '../../shared/links.js';
import { implicitLinks, keepImplicit } from '../canvas/implicit-links.js';
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
        const { id: _id, ...rest } = parsed;
        const next = upsertLink(file, rest);
        saved = next.link;
        return next.file;
      },
      'user',
    );
    return c.json({ links, link: saved });
  });

  app.get('/api/projects/:pid/links/implicit', async (c) => {
    const project = await projects.get(c.req.param('pid'));
    return c.json({ implicit: await implicitLinks({ canvas, project }) });
  });

  app.post('/api/projects/:pid/links/keep', async (c) => {
    const body = await readBody(c);
    const project = await projects.get(c.req.param('pid'));
    const ids = body.ids === 'all' ? 'all' : Array.isArray(body.ids) ? body.ids.filter(isImplicitId) : [];
    if (ids !== 'all' && ids.length === 0) throw new BadRequestError('ids must be implicit link ids or "all"');
    const done = await keepImplicit({ canvas, project }, ids, 'user', motionOf(body));
    if (done.kept.length === 0) throw new NotFoundError('implicit link not found');
    return c.json({ links: done.file, kept: done.kept });
  });

  app.patch('/api/projects/:pid/links/:lid', async (c) => {
    const body = await readBody(c);
    const project = await projects.get(c.req.param('pid'));
    const id = linkId(c);
    const to = body.to === undefined ? undefined : targetOf(body.to);
    if (to === null) throw new BadRequestError('to must be {frame} or {back: true}');
    if (body.transition !== undefined && !isLinkTransition(body.transition)) throw new BadRequestError('unknown transition');
    if (body.action !== undefined && !isLinkAction(body.action)) throw new BadRequestError('action must be navigate, modal or drawer');
    if (body.easing !== undefined && !isLinkEasing(body.easing)) throw new BadRequestError('unknown easing');
    const motion = motionOf(body);
    let found = false;
    const links = await canvas.links.update(
      project,
      (file) => {
        found = file.links.some((link) => link.id === id);
        if (!found) return null;
        return {
          ...file,
          links: file.links.map((link) => (link.id !== id ? link : withMotion({ ...link, ...(to ? { to } : {}) }, motion))),
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
