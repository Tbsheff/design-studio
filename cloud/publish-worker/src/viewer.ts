import { cookieValue, COOKIE_TTL_S, makePass, parsePasswordHash, passValid, passwordMatches, randomId, type PasswordHash } from './crypto';
import { blobKey, countView, fileOf, publicationBySlug, type FileRow, type PublicationRow } from './db';
import { ApiError, clientKey, designCsp, PAGE_CSP, secure, type Env } from './http';
import { clientBucket, takeToken } from './limits';
import { commentsPage, gatePage, messagePage } from './pages';
import { candidates, decodeRest } from './paths';
import { LIMITS, type RemoteComment } from './protocol';

interface Ctx {
  request: Request;
  env: Env;
  exec: ExecutionContext;
  pub: PublicationRow;
  base: string;
  root: string;
}

const SLUG = /^[a-z0-9-]{3,48}$/;
const ACCESS = /^~k\/(\d{9,11}\.[0-9a-f]{64})\/(.*)$/;

function page(response: Response, pub: PublicationRow | null): Response {
  return secure(response, { csp: PAGE_CSP, noindex: pub ? pub.noindex === 1 : true });
}

function redirect(status: number, location: string, pub: PublicationRow, extra: Record<string, string> = {}): Response {
  return page(new Response(null, { status, headers: { location, ...extra } }), pub);
}

function cookieName(pub: PublicationRow): string {
  return `ds_pass_${pub.id.replace(/[^A-Za-z0-9]/g, '')}`;
}

function blocked(pub: PublicationRow): Response | null {
  if (pub.revoked_at !== null) return page(messagePage(410, 'This link was turned off', 'The owner unpublished this design.'), pub);
  if (pub.expires_at !== null && Date.now() > pub.expires_at) return page(messagePage(410, 'This link has ended', 'The owner set this design to stop working after a date. Ask them for a new link.'), pub);
  if (!pub.current_version) return page(messagePage(404, 'Nothing published yet', 'This design has no live version.'), pub);
  return null;
}

async function findFile(ctx: Ctx, rest: string): Promise<{ file: FileRow; redirect: string | null } | null> {
  for (const path of candidates(rest)) {
    const file = await fileOf(ctx.env.DB, ctx.pub.current_version as string, path);
    if (file) return { file, redirect: path.endsWith('/index.html') && !rest.endsWith('/') && rest !== '' ? `${ctx.root}${rest}/` : null };
  }
  return null;
}

function fileHeaders(ctx: Ctx, file: FileRow): Headers {
  const headers = new Headers({ 'content-type': file.content_type, etag: `"${file.sha256}"`, 'content-length': String(file.size) });
  headers.set('cache-control', ctx.pub.password_hash !== null ? 'private, no-store' : 'public, max-age=60, must-revalidate');
  if (!file.content_type.startsWith('text/html')) headers.set('access-control-allow-origin', '*');
  return headers;
}

async function serveFile(ctx: Ctx, rest: string): Promise<Response> {
  const found = await findFile(ctx, rest);
  if (!found) return page(messagePage(404, 'Page not found', 'This page is not part of the published design.'), ctx.pub);
  if (found.redirect) return redirect(301, found.redirect, ctx.pub);
  const { file } = found;
  const headers = fileHeaders(ctx, file);
  const opts = { csp: designCsp(ctx.pub.kind, `${new URL(ctx.request.url).origin}${ctx.root}`), noindex: ctx.pub.noindex === 1 };
  if (ctx.request.headers.get('if-none-match') === `"${file.sha256}"`) return secure(new Response(null, { status: 304, headers }), opts);
  const object = ctx.request.method === 'HEAD' ? null : await ctx.env.FILES.get(blobKey(ctx.pub.id, file.sha256));
  if (ctx.request.method !== 'HEAD' && !object) return page(messagePage(404, 'File missing', 'This file of the design is not in storage.'), ctx.pub);
  if (file.content_type.startsWith('text/html')) ctx.exec.waitUntil(countView(ctx.env.DB, ctx.pub.id).catch(() => undefined));
  return secure(new Response(object?.body ?? null, { status: 200, headers }), opts);
}

async function formOf(request: Request): Promise<FormData> {
  const length = Number(request.headers.get('content-length') ?? '0');
  if (length > 16 * 1024) throw new ApiError(413, 'too_large', 'The form is too large.');
  try {
    return await request.formData();
  } catch {
    throw new ApiError(400, 'bad_form', 'The form is not valid.');
  }
}

function nextRest(raw: string | null): string {
  return raw && !raw.startsWith('/') && !raw.startsWith('~') && !raw.includes('//') && !raw.includes('\\') && raw.length < 600 ? raw : '';
}

function gate(ctx: Ctx, rest: string, error: string | null, status = 401): Response {
  return page(gatePage(ctx.pub.title, `${ctx.base}~/unlock?next=${encodeURIComponent(rest)}`, error, status), ctx.pub);
}

async function unlock(ctx: Ctx, stored: PasswordHash): Promise<Response> {
  const next = nextRest(new URL(ctx.request.url).searchParams.get('next'));
  try {
    await takeToken(ctx.env.DB, await clientBucket(`unlock:${ctx.pub.id}`, clientKey(ctx.request), ctx.env.PUBLISH_KEY_HASH), LIMITS.unlockPer10Min, 600_000, 'Too many tries. Wait 10 minutes.');
  } catch (error) {
    if (error instanceof ApiError) return gate(ctx, next, error.message, 429);
    throw error;
  }
  const password = String((await formOf(ctx.request)).get('password') ?? '').slice(0, 128);
  if (!password || !(await passwordMatches(password, stored))) return gate(ctx, next, 'That password is not right.');
  const secureFlag = new URL(ctx.request.url).protocol === 'https:' ? '; Secure' : '';
  const token = await makePass(ctx.env.PUBLISH_KEY_HASH, ctx.pub.id, stored.salt);
  const cookie = `${cookieName(ctx.pub)}=${token}; Path=${ctx.base}; Max-Age=${COOKIE_TTL_S}; HttpOnly; SameSite=Lax${secureFlag}`;
  return redirect(303, `${ctx.base}~k/${token}/${next}`, ctx.pub, { 'set-cookie': cookie });
}

async function commentList(ctx: Ctx): Promise<RemoteComment[]> {
  const rows = await ctx.env.DB.prepare('SELECT id, author, body, created_at FROM comments WHERE publication_id = ?1 ORDER BY created_at DESC LIMIT 100').bind(ctx.pub.id).all<{ id: string; author: string; body: string; created_at: number }>();
  return rows.results.map((r) => ({ id: r.id, author: r.author, body: r.body, createdAt: r.created_at }));
}

function clean(raw: unknown, max: number): string | null {
  const value = String(raw ?? '').replace(/[\u0000-\u0008\u000b-\u001f\u007f]+/g, ' ').trim();
  return value.length >= 1 && value.length <= max ? value : null;
}

async function postComment(ctx: Ctx): Promise<string | null> {
  const form = await formOf(ctx.request);
  const author = clean(form.get('author'), LIMITS.commentAuthorMax);
  const body = clean(form.get('body'), LIMITS.commentBodyMax);
  if (!author || !body) return `Type a name (1 to ${LIMITS.commentAuthorMax} characters) and a comment (1 to ${LIMITS.commentBodyMax} characters).`;
  try {
    await takeToken(ctx.env.DB, await clientBucket(`comment:${ctx.pub.id}`, clientKey(ctx.request), ctx.env.PUBLISH_KEY_HASH), LIMITS.commentsPer10Min, 600_000, 'You sent many comments. Wait 10 minutes.');
  } catch (error) {
    if (error instanceof ApiError) return error.message;
    throw error;
  }
  await ctx.env.DB.prepare('INSERT INTO comments (id, publication_id, author, body, created_at) VALUES (?1, ?2, ?3, ?4, ?5)').bind(randomId(9), ctx.pub.id, author, body, Date.now()).run();
  return null;
}

async function comments(ctx: Ctx): Promise<Response> {
  if (ctx.pub.comments_enabled !== 1) return page(messagePage(404, 'Comments are off', 'The owner did not turn on comments for this design.'), ctx.pub);
  const action = `${ctx.root}~/comments`;
  let error: string | null = null;
  if (ctx.request.method === 'POST') {
    error = await postComment(ctx);
    if (!error) return redirect(303, `${action}?sent=1`, ctx.pub);
  }
  const sent = new URL(ctx.request.url).searchParams.get('sent') === '1';
  return page(commentsPage({ title: ctx.pub.title, designHref: ctx.root, action, comments: await commentList(ctx), error, sent }, error ? 400 : 200), ctx.pub);
}

async function serveInside(ctx: Ctx, rest: string): Promise<Response> {
  const method = ctx.request.method;
  if (rest === '~/comments' && (method === 'GET' || method === 'POST')) return comments(ctx);
  if (rest.startsWith('~')) return page(messagePage(404, 'Page not found', 'This page is not part of the published design.'), ctx.pub);
  if (method !== 'GET' && method !== 'HEAD') return page(new Response('Method not allowed', { status: 405, headers: { allow: 'GET, HEAD' } }), ctx.pub);
  return serveFile(ctx, decodeRest(rest));
}

async function routeLocked(ctx: Ctx, rest: string, stored: PasswordHash | null): Promise<Response> {
  if (!stored) return page(messagePage(500, 'Password setting is broken', 'Ask the owner to publish this design again.'), ctx.pub);
  if (rest === '~/unlock' && ctx.request.method === 'POST') return unlock(ctx, stored);
  const access = ACCESS.exec(rest);
  const keyHash = ctx.env.PUBLISH_KEY_HASH;
  if (access && (await passValid(keyHash, ctx.pub.id, stored.salt, access[1] as string))) return serveInside({ ...ctx, root: `${ctx.base}~k/${access[1]}/` }, access[2] as string);
  const inner = access ? (access[2] as string) : rest;
  const cookie = cookieValue(ctx.request, cookieName(ctx.pub));
  if (cookie && (await passValid(keyHash, ctx.pub.id, stored.salt, cookie)) && ctx.request.method === 'GET') return redirect(302, `${ctx.base}~k/${cookie}/${inner}`, ctx.pub);
  return gate(ctx, inner, null);
}

async function routeInside(ctx: Ctx, rest: string): Promise<Response> {
  if (ctx.pub.password_hash !== null) return routeLocked(ctx, rest, parsePasswordHash(ctx.pub.password_hash));
  const access = ACCESS.exec(rest);
  if (access || rest === '~/unlock') return redirect(302, `${ctx.base}${access?.[2] ?? ''}`, ctx.pub);
  return serveInside(ctx, rest);
}

export async function handleDesign(request: Request, env: Env, exec: ExecutionContext, slug: string, rest: string | null): Promise<Response> {
  if (!SLUG.test(slug)) return page(messagePage(404, 'Design not found', 'Check the address. It may have a typo.'), null);
  const pub = await publicationBySlug(env.DB, slug);
  if (!pub) return page(messagePage(404, 'Design not found', 'Check the address. It may have a typo.'), null);
  const base = `/d/${slug}/`;
  if (rest === null) return redirect(301, base, pub);
  const stop = blocked(pub);
  if (stop) return stop;
  return routeInside({ request, env, exec, pub, base, root: base }, rest);
}

export async function robots(env: Env): Promise<Response> {
  const rows = await env.DB.prepare('SELECT slug FROM publications WHERE noindex = 0 AND revoked_at IS NULL LIMIT 500').all<{ slug: string }>();
  const allow = rows.results.map((r) => `Allow: /d/${r.slug}/`).join('\n');
  return page(new Response(`User-agent: *\n${allow}${allow ? '\n' : ''}Disallow: /\n`, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=300' } }), null);
}
