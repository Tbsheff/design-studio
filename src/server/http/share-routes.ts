import { rm } from 'node:fs/promises';
import type { Context, Hono } from 'hono';
import type { Direction, Project } from '../../shared/contracts.js';
import type { ExportFrame } from '../../shared/export.js';
import { SHARE_DEFAULT_EXPIRY_HOURS, SHARE_EXPIRY_HOURS, SHARE_MAX_FRAMES, type ShareCreated, type ShareExpiryHours, type ShareList } from '../../shared/share.js';
import { readProjectCanvas } from '../canvas/service.js';
import { parseFrames, resolveSource, type ExportDeps } from '../export/source.js';
import { createShareListener, type ShareListener } from '../share/listener.js';
import { captureShare } from '../share/snapshot.js';
import { createShareStore, toLink, type ShareStore } from '../share/store.js';
import { createViewerApp } from '../share/viewer-app.js';
import type { CommentStore } from '../store/comments.js';
import { BadRequestError, NotFoundError, assertSafeId } from '../store/errors.js';

export interface ShareRouteDeps extends ExportDeps {
  dataDir: string;
  studioPort: number;
  comments: CommentStore;
  readBody: (c: Context) => Promise<Record<string, unknown>>;
}

function sharePort(studioPort: number): number {
  const raw = Number(process.env.STUDIO_SHARE_PORT);
  return Number.isInteger(raw) && raw > 0 && raw < 65536 ? raw : studioPort + 5;
}

function expiryOf(raw: unknown): ShareExpiryHours {
  if (raw === undefined || raw === null) return SHARE_DEFAULT_EXPIRY_HOURS;
  if (!SHARE_EXPIRY_HOURS.includes(raw as ShareExpiryHours)) throw new BadRequestError(`expiresInHours must be one of ${SHARE_EXPIRY_HOURS.join(', ')}`);
  return raw as ShareExpiryHours;
}

async function canvasFrames(deps: ShareRouteDeps, project: Project, direction: Direction): Promise<ExportFrame[]> {
  const frames = (await readProjectCanvas(project, (id) => deps.projects.projectDir(id)).catch(() => null))?.canvas?.frames ?? [];
  const own = frames.filter((f) => !f.hidden && (!f.directionId || f.directionId === direction.id)).sort((a, b) => a.order - b.order);
  return own.map((f) => ({ name: f.label?.trim() || `${f.width} × ${f.height}`, width: f.width, height: f.height, ...(f.path ? { path: f.path } : {}) }));
}

async function framesOf(deps: ShareRouteDeps, project: Project, direction: Direction, raw: unknown): Promise<ExportFrame[]> {
  const picked = Array.isArray(raw) && raw.length > 0 ? parseFrames(raw) : await canvasFrames(deps, project, direction);
  const frames = picked.length > 0 ? picked : parseFrames(undefined);
  if (frames.length > SHARE_MAX_FRAMES) throw new BadRequestError(`share at most ${SHARE_MAX_FRAMES} frames`);
  return frames;
}

function titleOf(raw: unknown, project: Project): string {
  const text = typeof raw === 'string' ? raw.replace(/[\p{Cc}\s]+/gu, ' ').trim().slice(0, 120) : '';
  return text || project.name;
}

async function createLink(deps: ShareRouteDeps, store: ShareStore, listener: ShareListener, pid: string, input: Record<string, unknown>): Promise<ShareCreated> {
  const project = await deps.projects.get(assertSafeId(pid, 'projectId'));
  const did = typeof input.directionId === 'string' ? assertSafeId(input.directionId, 'directionId') : project.directions[0]?.id;
  const direction = project.directions.find((d) => d.id === did);
  if (!direction) throw new NotFoundError('direction not found');
  const versionId = typeof input.versionId === 'string' ? input.versionId : direction.headVersionId;
  if (!versionId) throw new BadRequestError('Save a version before you share it.');
  const expiresAt = Date.now() + expiryOf(input.expiresInHours) * 3600_000;
  const source = await resolveSource(deps, project.id, versionId);
  const frames = await framesOf(deps, project, direction, input.frames);
  const id = store.newId();
  const dir = store.framesDir(id);
  try {
    const shots = await captureShare(deps.preview, source, frames, dir);
    const { record, token } = await store.add(id, { projectId: project.id, directionId: direction.id, versionId: source.version.id, title: titleOf(input.title, project), frames: shots, expiresAt });
    return { link: toLink(record), token, server: await listener.sync() };
  } catch (error) {
    await rm(dir, { recursive: true, force: true });
    throw error;
  }
}

export function registerShareRoutes(app: Hono, deps: ShareRouteDeps): ShareListener {
  const store = createShareStore(deps.dataDir);
  const listener = createShareListener(createViewerApp({ shares: store, comments: deps.comments }), store, sharePort(deps.studioPort));
  void listener.sync().catch((error: unknown) => console.error('[share] listener start failed', error));

  app.get('/api/projects/:pid/shares', async (c) => {
    const project = await deps.projects.get(assertSafeId(c.req.param('pid'), 'projectId'));
    const now = Date.now();
    const links = (await store.list(project.id)).map((r) => toLink(r, now)).sort((a, b) => b.createdAt - a.createdAt);
    return c.json({ links, server: listener.state() } satisfies ShareList);
  });

  app.post('/api/projects/:pid/shares', async (c) => c.json(await createLink(deps, store, listener, c.req.param('pid'), await deps.readBody(c)), 201));

  app.delete('/api/projects/:pid/shares/:id', async (c) => {
    const project = await deps.projects.get(assertSafeId(c.req.param('pid'), 'projectId'));
    const id = assertSafeId(c.req.param('id'), 'shareId');
    const found = (await store.list(project.id)).find((r) => r.id === id);
    if (!found) throw new NotFoundError('share link not found');
    const revoked = await store.revoke(id);
    return c.json({ link: revoked ? toLink(revoked) : null, server: await listener.sync() });
  });

  app.put('/api/shares/lan', async (c) => {
    const input = await deps.readBody(c);
    if (typeof input.on !== 'boolean') throw new BadRequestError('on must be true or false');
    return c.json({ server: await listener.setLan(input.on) });
  });

  return listener;
}
