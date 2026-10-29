import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { getConnInfo } from '@hono/node-server/conninfo';
import { Hono, type Context } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { streamSSE } from 'hono/streaming';
import { z } from 'zod';
import type { DesignComment } from '../../shared/contracts.js';
import { SHARE_COMMENT_MAX, SHARE_LIVE_VIEWERS_MAX, SHARE_NAME_MAX } from '../../shared/share.js';
import type { CommentStore } from '../store/comments.js';
import type { LiveHub } from './live.js';
import { frameFile } from './snapshot.js';
import type { ShareRecord, ShareStore } from './store.js';
import { goneHtml, viewerHtml } from './viewer-page.js';

const BODY_MAX = 8 * 1024;
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 10;
const LINK_COMMENTS_MAX = 200;
const CURSOR_BODY_MAX = 512;
const JOIN_MAX = 30;
const PING_MS = 15_000;

const cursorSchema = z
  .object({
    key: z.string().regex(/^[A-Za-z0-9_-]{24}$/),
    name: z.string().trim().max(SHARE_NAME_MAX),
    frame: z.number().int().min(0).max(100).nullable(),
    x: z.number().min(0).max(100_000),
    y: z.number().min(0).max(100_000),
  })
  .strict();

const postSchema = z
  .object({
    name: z.string().trim().min(1).max(SHARE_NAME_MAX),
    text: z.string().trim().min(1).max(SHARE_COMMENT_MAX),
    frame: z.number().int().min(0).max(100),
    x: z.number().int().min(0).max(100_000).nullable(),
    y: z.number().int().min(0).max(100_000).nullable(),
  })
  .strict();

export interface ViewerAppDeps {
  shares: ShareStore;
  comments: CommentStore;
  hub: LiveHub;
}

const BASE_HEADERS: Record<string, string> = {
  'cache-control': 'no-store',
  'referrer-policy': 'no-referrer',
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'x-robots-tag': 'noindex, nofollow',
  'cross-origin-resource-policy': 'same-origin',
  'cross-origin-opener-policy': 'same-origin',
};

function csp(nonce: string): string {
  return `default-src 'none'; img-src 'self'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'`;
}

function notFound(c: Context): Response {
  return c.text('This link does not exist, has ended, or was turned off.', 404);
}

async function goneOrNotFound(c: Context, deps: ViewerAppDeps): Promise<Response> {
  const ended = await deps.shares.endedByToken(c.req.param('token') ?? '');
  if (!ended) return notFound(c);
  const nonce = randomBytes(16).toString('base64');
  return c.html(goneHtml(ended, nonce), 410, { 'content-security-policy': `default-src 'none'; style-src 'nonce-${nonce}'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'` });
}

function createLimiter(max = RATE_MAX, now = Date.now) {
  const hits = new Map<string, number[]>();
  return (key: string): boolean => {
    const t = now();
    const recent = (hits.get(key) ?? []).filter((at) => t - at < RATE_WINDOW_MS);
    if (recent.length >= max) {
      hits.set(key, recent);
      return false;
    }
    recent.push(t);
    hits.set(key, recent);
    if (hits.size > 5000) hits.delete(hits.keys().next().value as string);
    return true;
  };
}

function remoteOf(c: Context): string {
  try {
    return getConnInfo(c).remote.address ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

function sameOrigin(c: Context): boolean {
  const origin = c.req.header('origin');
  if (!origin) return true;
  const host = c.req.header('host');
  return host !== undefined && origin === `http://${host}`;
}

interface ViewerComment {
  n: number;
  author: string;
  text: string;
  frame: number;
  x: number | null;
  y: number | null;
  createdAt: number;
}

function viewerComment(record: ShareRecord, comment: DesignComment): ViewerComment {
  const index = record.frames.findIndex((f) => (f.path ?? '') === (comment.frame?.path ?? '') && f.name === comment.frame?.label);
  const hint = comment.target.rectHint;
  const pinned = comment.target.selector !== 'body' || hint.width > 0;
  return { n: comment.n, author: comment.author ?? 'Viewer', text: comment.text, frame: Math.max(0, index), x: pinned ? Math.round(hint.x) : null, y: pinned ? Math.round(hint.y) : null, createdAt: comment.createdAt };
}

async function linkComments(deps: ViewerAppDeps, record: ShareRecord): Promise<ViewerComment[]> {
  const ids = new Set(record.commentIds);
  const all = await deps.comments.list(record.projectId, record.directionId).catch(() => []);
  return all.filter((c) => ids.has(c.id) && c.from === 'viewer').map((c) => viewerComment(record, c));
}

async function postComment(deps: ViewerAppDeps, record: ShareRecord, input: z.infer<typeof postSchema>): Promise<ViewerComment> {
  const frame = record.frames[input.frame] ?? record.frames[0];
  const spot = input.x !== null && input.y !== null ? { x: input.x, y: input.y, width: 1, height: 1 } : { x: 0, y: 0, width: 0, height: 0 };
  const comment = await deps.comments.create(record.projectId, record.directionId, {
    text: input.text,
    target: { selector: 'body', tag: 'body', textSnippet: input.x !== null && input.y !== null ? `${frame?.name ?? 'Frame'} at ${input.x}, ${input.y}`.slice(0, 200) : '', rectHint: spot },
    status: 'draft',
    author: input.name,
    from: 'viewer',
    ...(frame ? { frame: { path: frame.path ?? '', label: frame.name } } : {}),
  });
  await deps.shares.addComment(record.id, comment.id);
  return viewerComment(record, comment);
}

export function createViewerApp(deps: ViewerAppDeps): Hono {
  const app = new Hono();
  const allow = createLimiter();
  const joins = createLimiter(JOIN_MAX);

  app.use('*', async (c, next) => {
    await next();
    for (const [key, value] of Object.entries(BASE_HEADERS)) c.res.headers.set(key, value);
    if (!c.res.headers.has('content-security-policy')) c.res.headers.set('content-security-policy', "default-src 'none'; frame-ancestors 'none'");
  });

  app.get('/s/:token', async (c) => {
    const record = await deps.shares.byToken(c.req.param('token'));
    if (!record) return goneOrNotFound(c, deps);
    const nonce = randomBytes(16).toString('base64');
    const html = viewerHtml({ base: `/s/${c.req.param('token')}`, title: record.title, expiresAt: record.expiresAt, frames: record.frames, live: record.live === true, rev: record.rev ?? 0 }, nonce);
    return c.html(html, 200, { 'content-security-policy': csp(nonce) });
  });

  app.get('/s/:token/f/:index', async (c) => {
    const record = await deps.shares.byToken(c.req.param('token'));
    const index = Number(c.req.param('index'));
    if (!record || !/^\d{1,3}$/.test(c.req.param('index')) || index >= record.frames.length) return notFound(c);
    const png = await readFile(frameFile(deps.shares.framesDir(record.id), index)).catch(() => null);
    if (!png) return notFound(c);
    return c.body(new Uint8Array(png), 200, { 'content-type': 'image/png' });
  });

  app.get('/s/:token/comments', async (c) => {
    const record = await deps.shares.byToken(c.req.param('token'));
    if (!record) return notFound(c);
    return c.json({ comments: await linkComments(deps, record) });
  });

  app.post(
    '/s/:token/comments',
    bodyLimit({ maxSize: BODY_MAX, onError: (c) => c.json({ error: 'The comment is too long.' }, 413) }),
    async (c) => {
      const record = await deps.shares.byToken(c.req.param('token'));
      if (!record) return notFound(c);
      if (!sameOrigin(c)) return c.json({ error: 'Send comments from the shared page.' }, 403);
      if (!(c.req.header('content-type') ?? '').startsWith('application/json')) return c.json({ error: 'Send the comment as JSON.' }, 415);
      if (!allow(`${record.id}|${remoteOf(c)}`)) return c.json({ error: 'Too many comments. Wait one minute, then try again.' }, 429);
      if (record.commentIds.length >= LINK_COMMENTS_MAX) return c.json({ error: 'This link has the most comments it can take.' }, 429);
      const parsed = postSchema.safeParse(await c.req.json().catch(() => null));
      if (!parsed.success) return c.json({ error: 'Type your name and a comment.' }, 400);
      return c.json({ comment: await postComment(deps, record, parsed.data) }, 201);
    },
  );

  app.get('/s/:token/live', async (c) => {
    const record = await deps.shares.byToken(c.req.param('token'));
    if (!record?.live) return notFound(c);
    if (!joins(`${record.id}|${remoteOf(c)}`)) return c.text('Too many connections. Wait one minute.', 429);
    if (deps.hub.count(record.id) >= SHARE_LIVE_VIEWERS_MAX) return c.text('This link has the most viewers it can take.', 429);
    return streamSSE(c, async (stream) => {
      let done = (): void => undefined;
      const ended = new Promise<void>((resolve) => (done = resolve));
      let last: Promise<void> = Promise.resolve();
      const send = (event: string, data: unknown): void => {
        last = stream.writeSSE({ event, data: JSON.stringify(data) }).catch(() => done());
      };
      const seat = deps.hub.join(record, send, () => {
        done();
        return last;
      });
      if (!seat) return;
      stream.onAbort(() => done());
      await stream.writeSSE({ data: '', retry: 1000 }).catch(() => done());
      send('hello', { key: seat.key, rev: record.rev ?? 0, studio: record.studioCursor === true });
      const ping = setInterval(() => send('ping', {}), PING_MS);
      try {
        await ended;
      } finally {
        clearInterval(ping);
        deps.hub.leave(record.id, seat.key);
      }
    });
  });

  app.post('/s/:token/cursor', bodyLimit({ maxSize: CURSOR_BODY_MAX, onError: (c) => c.body(null, 413) }), async (c) => {
    const record = await deps.shares.byToken(c.req.param('token'));
    if (!record?.live) return notFound(c);
    if (!sameOrigin(c) || !(c.req.header('content-type') ?? '').startsWith('application/json')) return c.body(null, 403);
    const parsed = cursorSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.body(null, 400);
    const result = deps.hub.cursor(record.id, { ...parsed.data, name: parsed.data.name.replace(/[\p{Cc}]+/gu, '') || 'Viewer' });
    return c.body(null, result === 'gone' ? 410 : 204);
  });

  app.all('*', notFound);
  app.onError((_error, c) => c.text('Something went wrong.', 500));
  return app;
}
