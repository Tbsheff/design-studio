import type http from 'node:http';
import { FRAME_STATE_HEADER, FRAME_STATE_ID_HEADER, mockRuleMatches, type MockRule } from '../../shared/frame-state.js';
import { captureCookies, hasSessionCookie, type ResolvedFrameState } from './frame-state.js';

const MOCK_SESSION_VALUE = 'studio-preview-session';
const BASE_SESSION_COOKIES = ['authjs.session-token', 'authjs.session_token', 'auth.session_token', 'next-auth.session-token', 'better-auth.session_token', '__session', 'auth_session'];
const LOADING_HOLD_MS = 120_000;
const MAX_EMPTY_BODY = 5 * 1024 * 1024;

export interface ActiveFrameState {
  resolved: ResolvedFrameState;
  env: Record<string, string> | undefined;
}

export function sessionCookieNames(env: Record<string, string> | undefined): string[] {
  const prefix = env?.AUTH_COOKIE_PREFIX?.trim();
  const extra = prefix && /^[\w.-]{1,40}$/.test(prefix) ? [`${prefix}.session-token`, `${prefix}.session_token`] : [];
  return [...new Set([...BASE_SESSION_COOKIES, ...extra])];
}

function parseCookieHeader(header: string | undefined): Map<string, string> {
  const map = new Map<string, string>();
  for (const part of (header ?? '').split(';')) {
    const at = part.indexOf('=');
    if (at > 0) map.set(part.slice(0, at).trim(), part.slice(at + 1).trim());
  }
  return map;
}

function usesCapturedSession(state: ActiveFrameState): boolean {
  return state.resolved.def.signedIn && hasSessionCookie(state.resolved.jar, sessionCookieNames(state.env));
}

function upstreamCookie(existing: string | undefined, state: ActiveFrameState): string | undefined {
  if (!state.resolved.def.signedIn) return existing;
  const cookies = parseCookieHeader(existing);
  if (!usesCapturedSession(state)) for (const name of sessionCookieNames(state.env)) if (!cookies.has(name)) cookies.set(name, MOCK_SESSION_VALUE);
  for (const [name, value] of Object.entries(state.resolved.jar)) cookies.set(name, value);
  return cookies.size === 0 ? undefined : [...cookies].map(([name, value]) => `${name}=${value}`).join('; ');
}

export function withStateHeaders(headers: http.OutgoingHttpHeaders, state: ActiveFrameState | null): http.OutgoingHttpHeaders {
  if (!state) return headers;
  const cookie = upstreamCookie(typeof headers.cookie === 'string' ? headers.cookie : undefined, state);
  const next: http.OutgoingHttpHeaders = { ...headers, [FRAME_STATE_HEADER]: state.resolved.def.kind, [FRAME_STATE_ID_HEADER]: state.resolved.def.id };
  if (cookie) next.cookie = cookie;
  else delete next.cookie;
  return next;
}

function pathOf(req: http.IncomingMessage): string {
  return (req.url ?? '/').split('?')[0] ?? '/';
}

export function isDataPath(pathname: string): boolean {
  if (pathname.startsWith('/api/auth/') || pathname === '/api/auth') return false;
  return pathname.startsWith('/api/') || pathname === '/api' || pathname.includes('/trpc/') || pathname.endsWith('/trpc');
}

function trpcProcedures(pathname: string): string[] | null {
  const at = pathname.indexOf('/trpc/');
  if (at < 0) return null;
  const tail = decodeURIComponent(pathname.slice(at + '/trpc/'.length));
  return tail ? tail.split(',') : null;
}

function sendJson(res: http.ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-studio-mock': '1' });
  res.end(JSON.stringify(body));
}

function mockUserBodies(state: ActiveFrameState): Record<string, unknown> {
  const now = new Date();
  const expires = new Date(now.getTime() + 7 * 864e5).toISOString();
  const user = { id: 'studio-preview-user', name: state.resolved.session.user.name, email: state.resolved.session.user.email, emailVerified: true, image: null, createdAt: now.toISOString(), updatedAt: now.toISOString() };
  const session = { id: 'studio-preview-session', userId: user.id, token: MOCK_SESSION_VALUE, expiresAt: expires, createdAt: now.toISOString(), updatedAt: now.toISOString() };
  return { '/api/auth/get-session': { session, user }, '/api/auth/session': { user: { name: user.name, email: user.email, image: null }, expires } };
}

function authMock(state: ActiveFrameState, method: string, pathname: string): unknown {
  if (!state.resolved.def.signedIn || usesCapturedSession(state) || method !== 'GET') return undefined;
  return mockUserBodies(state)[pathname];
}

function errorBody(pathname: string): unknown {
  const message = 'Design Studio error state: this call failed on purpose.';
  const procedures = trpcProcedures(pathname);
  if (!procedures) return { error: message, message };
  const one = (procedure: string) => {
    const data = { code: 'INTERNAL_SERVER_ERROR', httpStatus: 500, path: procedure };
    return { error: { json: { message, code: -32603, data }, message, code: -32603, data } };
  };
  return procedures.length > 1 ? procedures.map(one) : one(procedures[0] ?? '');
}

function findMock(rules: MockRule[] | undefined, method: string, pathname: string): MockRule | null {
  return rules?.find((rule) => mockRuleMatches(rule, method, pathname)) ?? null;
}

function holdOpen(req: http.IncomingMessage, res: http.ServerResponse): void {
  const timer = setTimeout(() => sendJson(res, 504, { error: 'Design Studio loading state ended after 2 minutes.' }), LOADING_HOLD_MS);
  timer.unref();
  const clear = (): void => clearTimeout(timer);
  res.once('close', clear);
  req.once('aborted', clear);
}

function answerMock(res: http.ServerResponse, rule: MockRule): void {
  const reply = (): void => sendJson(res, rule.status ?? 200, rule.body ?? null);
  if (rule.delayMs) setTimeout(reply, rule.delayMs).unref();
  else reply();
}

export function answerState(req: http.IncomingMessage, res: http.ServerResponse, state: ActiveFrameState, isDocument: boolean): boolean {
  const method = (req.method ?? 'GET').toUpperCase();
  const pathname = pathOf(req);
  const auth = authMock(state, method, pathname);
  if (auth !== undefined) {
    sendJson(res, 200, auth);
    return true;
  }
  if (isDocument) return false;
  const rule = findMock(state.resolved.def.mocks, method, pathname);
  if (rule) {
    answerMock(res, rule);
    return true;
  }
  if (!isDataPath(pathname)) return false;
  if (state.resolved.def.kind === 'loading') {
    holdOpen(req, res);
    return true;
  }
  if (state.resolved.def.kind === 'error') {
    sendJson(res, 500, errorBody(pathname));
    return true;
  }
  return false;
}

export function captureSessionCookies(state: ActiveFrameState | null, headers: http.OutgoingHttpHeaders): void {
  if (!state?.resolved.def.signedIn) return;
  const raw = headers['set-cookie'];
  const list = Array.isArray(raw) ? raw : typeof raw === 'string' ? [raw] : [];
  delete headers['set-cookie'];
  void captureCookies(state.resolved.projectDir, list).catch((error: unknown) => console.error('[frame-state] session capture failed', error));
}

export function wantsEmpty(state: ActiveFrameState | null, req: http.IncomingMessage): boolean {
  if (state?.resolved.def.kind !== 'empty' || !isDataPath(pathOf(req))) return false;
  return !String(req.headers['trpc-accept'] ?? '').includes('jsonl');
}

function isJsonOk(status: number, upstreamRes: http.IncomingMessage): boolean {
  const type = upstreamRes.headers['content-type'] ?? '';
  return status < 400 && type.includes('json') && !type.includes('jsonl');
}

function syntheticEmpty(pathname: string): unknown {
  const procedures = trpcProcedures(pathname);
  if (!procedures) return [];
  const one = () => ({ result: { data: { json: [] } } });
  return procedures.length > 1 ? procedures.map(one) : one();
}

function emptyArrays(value: unknown, depth: number): unknown {
  if (depth > 40) return value;
  if (Array.isArray(value)) return [];
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, emptyArrays(item, depth + 1)]));
}

function emptyTrpc(value: unknown): unknown {
  const one = (item: unknown): unknown => {
    if (!item || typeof item !== 'object' || !('result' in item)) return item;
    const result = (item as { result: { data?: unknown } }).result;
    return { ...item, result: { ...result, data: emptyArrays(result?.data, 0) } };
  };
  return Array.isArray(value) ? value.map(one) : one(value);
}

export function sendEmptied(req: http.IncomingMessage, res: http.ServerResponse, upstreamRes: http.IncomingMessage, status: number, headers: http.OutgoingHttpHeaders): void {
  if (!isJsonOk(status, upstreamRes)) {
    upstreamRes.resume();
    sendJson(res, 200, syntheticEmpty(pathOf(req)));
    return;
  }
  const chunks: Buffer[] = [];
  let size = 0;
  upstreamRes.on('data', (chunk: Buffer) => {
    size += chunk.length;
    chunks.push(chunk);
  });
  upstreamRes.on('end', () => {
    const text = Buffer.concat(chunks).toString('utf8');
    let body = text;
    try {
      if (size <= MAX_EMPTY_BODY) {
        const parsed: unknown = JSON.parse(text);
        body = JSON.stringify(trpcProcedures(pathOf(req)) ? emptyTrpc(parsed) : emptyArrays(parsed, 0));
      }
    } catch {
      body = text;
    }
    res.writeHead(status, { ...headers, 'x-studio-mock': '1' });
    res.end(body);
  });
  upstreamRes.on('error', () => res.destroy());
}
