import http from 'node:http';
import net from 'node:net';
import type { Duplex } from 'node:stream';
import { BRIDGE_CHANGES_PATH, BRIDGE_PARENT_ORIGIN_PARAM, BRIDGE_SCRIPT_PATH, BRIDGE_TOKEN_PARAM } from '../../shared/contracts.js';
import { APP_REDIRECT_PARAM, APP_SOURCE_PATH } from '../../shared/app.js';
import { FRAME_STATE_ATTR, stateOfHost } from '../../shared/frame-state.js';
import { answerState, captureSessionCookies, sendEmptied, wantsEmpty, withStateHeaders, type ActiveFrameState } from './frame-state-proxy.js';
import { resolveStackSources, type SourceTarget } from './source-map.js';

const HOST_PATTERN = /^(?:s-[a-z][a-z0-9-]{0,23}\.)?p-([0-9a-f]{2,128})\.localhost(?::(\d+))?$/;
const DROPPED_RESPONSE_HEADERS = new Set(['x-frame-options', 'strict-transport-security', 'content-length', 'transfer-encoding', 'connection', 'keep-alive']);
const HEAD_SCAN_LIMIT = 64 * 1024;
const MAX_SOURCE_BODY = 256 * 1024;

export interface AppTarget extends SourceTarget {
  upstream: string;
}

export interface AppProxyOptions {
  port: number;
  studioOrigin: string;
  bridgeScript: () => Promise<string>;
  targetFor: (projectId: string) => Promise<AppTarget | null>;
  isApp: (projectId: string) => Promise<boolean>;
  stateFor?: (projectId: string, stateId: string) => Promise<ActiveFrameState | null>;
}

function hostState(hostHeader: string | undefined): string | null {
  return stateOfHost((hostHeader ?? '').replace(/:\d+$/, ''))?.state ?? null;
}

export function projectIdFromHost(hostHeader: string | undefined, port: number): string | null {
  const match = HOST_PATTERN.exec((hostHeader ?? '').toLowerCase());
  if (!match?.[1] || (match[2] !== undefined && Number(match[2]) !== port) || match[1].length % 2 !== 0) return null;
  const bytes = match[1].match(/../g)?.map((pair) => Number.parseInt(pair, 16)) ?? [];
  return new TextDecoder().decode(new Uint8Array(bytes));
}

function frameAncestors(studioOrigin: string): string {
  const origins = new Set([studioOrigin, 'http://127.0.0.1:5173', 'http://localhost:5173']);
  return `frame-ancestors ${[...origins].join(' ')}`;
}

function rewriteCsp(value: string, studioOrigin: string): string {
  const kept = value
    .split(';')
    .map((part) => part.trim())
    .filter((part) => part !== '' && !/^frame-ancestors\b/i.test(part) && !/^upgrade-insecure-requests\b/i.test(part));
  return [...kept, frameAncestors(studioOrigin)].join('; ');
}

function stripCookieDomain(cookie: string): string {
  return cookie
    .split(';')
    .filter((part) => !/^\s*domain=/i.test(part))
    .join(';');
}

function isDocumentRequest(req: http.IncomingMessage): boolean {
  const dest = req.headers['sec-fetch-dest'];
  if (typeof dest === 'string') return dest === 'document' || dest === 'iframe';
  return (req.headers.accept ?? '').includes('text/html') && !req.headers['rsc'];
}

function upstreamHeaders(req: http.IncomingMessage, upstream: URL, previewOrigin: string): http.OutgoingHttpHeaders {
  const headers: http.OutgoingHttpHeaders = { ...req.headers };
  headers.host = upstream.host;
  headers['accept-encoding'] = 'identity';
  if (typeof headers.origin === 'string') headers.origin = upstream.origin;
  if (typeof headers.referer === 'string' && headers.referer.startsWith(previewOrigin)) headers.referer = upstream.origin + headers.referer.slice(previewOrigin.length);
  delete headers.connection;
  return headers;
}

function sameUpstream(location: URL, upstream: URL): boolean {
  if (location.origin === upstream.origin) return true;
  const loopback = new Set(['localhost', '127.0.0.1', '[::1]', '0.0.0.0']);
  return loopback.has(location.hostname) && loopback.has(upstream.hostname) && location.port === upstream.port;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

function messagePage(title: string, detail: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><script src="${BRIDGE_SCRIPT_PATH}" data-studio-app="message"></script><style>body{font:14px/1.5 system-ui,sans-serif;margin:0;display:grid;place-items:center;min-height:100vh;background:#f5f5f4;color:#292524}main{max-width:460px;padding:24px}h1{font-size:16px;margin:0 0 8px}p{margin:0 0 8px;color:#57534e}code{font-size:12px;word-break:break-all}</style></head><body><main><h1>${escapeHtml(title)}</h1><p>${escapeHtml(detail)}</p></main></body></html>`;
}

function bridgeTag(stateId: string | null): string {
  const state = stateId ? ` ${FRAME_STATE_ATTR}="${escapeHtml(stateId)}"` : '';
  return `<script src="${BRIDGE_SCRIPT_PATH}" data-studio-app="next"${state}></script>`;
}

function injectBridge(res: http.ServerResponse, upstreamRes: http.IncomingMessage, stateId: string | null): void {
  const tag = bridgeTag(stateId);
  let buffered = '';
  let done = false;
  upstreamRes.setEncoding('utf8');
  upstreamRes.on('data', (chunk: string) => {
    if (done) {
      res.write(chunk);
      return;
    }
    buffered += chunk;
    const head = /<head\b[^>]*>/i.exec(buffered);
    if (head) {
      const at = head.index + head[0].length;
      res.write(buffered.slice(0, at) + tag + buffered.slice(at));
      done = true;
      buffered = '';
    } else if (buffered.length > HEAD_SCAN_LIMIT) {
      res.write(tag + buffered);
      done = true;
      buffered = '';
    }
  });
  upstreamRes.on('end', () => {
    if (!done && buffered !== '') res.write(/<html/i.test(buffered) ? buffered.replace(/<html\b[^>]*>/i, (open) => open + tag) : tag + buffered);
    res.end();
  });
  upstreamRes.on('error', () => res.destroy());
}

function readBody(req: http.IncomingMessage, limit: number): Promise<string> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error('body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function sendText(res: http.ServerResponse, status: number, body: string, type = 'text/plain; charset=utf-8', studioOrigin?: string): void {
  res.writeHead(status, {
    'content-type': type,
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    ...(studioOrigin ? { 'content-security-policy': frameAncestors(studioOrigin) } : {}),
  });
  res.end(body);
}

export function createAppProxy(options: AppProxyOptions) {
  const previewOriginOf = (req: http.IncomingMessage): string => `http://${req.headers.host ?? ''}`;

  const serveSource = async (req: http.IncomingMessage, res: http.ServerResponse, target: AppTarget): Promise<void> => {
    if (req.method !== 'POST') return sendText(res, 405, 'POST only');
    let stacks: string[];
    try {
      const parsed = JSON.parse(await readBody(req, MAX_SOURCE_BODY)) as { stacks?: unknown };
      stacks = Array.isArray(parsed.stacks) ? parsed.stacks.filter((stack): stack is string => typeof stack === 'string').slice(0, 20) : [];
    } catch {
      return sendText(res, 400, 'bad body');
    }
    const sources = await resolveStackSources(target, stacks, previewOriginOf(req)).catch(() => stacks.map(() => null));
    sendText(res, 200, JSON.stringify({ sources }), 'application/json');
  };

  const redirectLocation = (req: http.IncomingMessage, raw: string, upstream: URL): { local: string } | { external: URL } | null => {
    let location: URL;
    try {
      location = new URL(raw, new URL(req.url ?? '/', upstream));
    } catch {
      return null;
    }
    if (!sameUpstream(location, upstream)) return { external: location };
    const original = new URL(req.url ?? '/', 'http://studio.invalid');
    const token = original.searchParams.get(BRIDGE_TOKEN_PARAM);
    const parent = original.searchParams.get(BRIDGE_PARENT_ORIGIN_PARAM);
    if (token && parent && isDocumentRequest(req)) {
      location.searchParams.set(BRIDGE_TOKEN_PARAM, token);
      location.searchParams.set(BRIDGE_PARENT_ORIGIN_PARAM, parent);
      if (!location.searchParams.has(APP_REDIRECT_PARAM)) location.searchParams.set(APP_REDIRECT_PARAM, original.pathname);
    }
    return { local: `${location.pathname}${location.search}${location.hash}` };
  };

  const responseHeaders = (upstreamRes: http.IncomingMessage): http.OutgoingHttpHeaders => {
    const headers: http.OutgoingHttpHeaders = {};
    for (const [key, value] of Object.entries(upstreamRes.headers)) {
      if (value === undefined || DROPPED_RESPONSE_HEADERS.has(key)) continue;
      if (key === 'content-security-policy' && typeof value === 'string') headers[key] = rewriteCsp(value, options.studioOrigin);
      else if (key === 'set-cookie' && Array.isArray(value)) headers[key] = value.map(stripCookieDomain);
      else headers[key] = value;
    }
    headers['content-security-policy'] ??= frameAncestors(options.studioOrigin);
    return headers;
  };

  const leaveAppPage = (req: http.IncomingMessage, res: http.ServerResponse, external: URL): void => {
    if (!isDocumentRequest(req)) {
      res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' });
      res.end(`redirect to ${external.origin} is outside the app`);
      return;
    }
    const detail = `The app sent this page to ${external.origin}${external.pathname}. Design Studio shows only pages from the app's dev server. Pick a route that does not need that redirect, or sign in to the app in this frame first.`;
    sendText(res, 200, messagePage('This route leaves the app', detail), 'text/html; charset=utf-8', options.studioOrigin);
  };

  const onUpstream = (req: http.IncomingMessage, res: http.ServerResponse, upstream: URL, upstreamRes: http.IncomingMessage, state: ActiveFrameState | null): void => {
    const status = upstreamRes.statusCode ?? 502;
    const headers = responseHeaders(upstreamRes);
    captureSessionCookies(state, headers);
    const isRedirect = status >= 300 && status < 400;
    const location = isRedirect && typeof upstreamRes.headers.location === 'string' ? redirectLocation(req, upstreamRes.headers.location, upstream) : null;
    if (location && 'external' in location) {
      upstreamRes.resume();
      leaveAppPage(req, res, location.external);
      return;
    }
    if (location) headers.location = location.local;
    const html = (upstreamRes.headers['content-type'] ?? '').includes('text/html') && req.method !== 'HEAD' && status !== 204 && status !== 304;
    if (wantsEmpty(state, req)) return sendEmptied(req, res, upstreamRes, status, headers);
    res.writeHead(status, headers);
    if (html) injectBridge(res, upstreamRes, state?.resolved.def.id ?? null);
    else upstreamRes.pipe(res);
  };

  const proxyRequest = (req: http.IncomingMessage, res: http.ServerResponse, target: AppTarget, state: ActiveFrameState | null): void => {
    const upstream = new URL(target.upstream);
    const headers = withStateHeaders(upstreamHeaders(req, upstream, previewOriginOf(req)), state);
    const outgoing = http.request({ host: upstream.hostname, port: upstream.port, method: req.method, path: req.url, headers }, (upstreamRes) => onUpstream(req, res, upstream, upstreamRes, state));
    outgoing.on('error', (error) => {
      if (res.headersSent) {
        res.destroy();
        return;
      }
      if (isDocumentRequest(req)) sendText(res, 502, messagePage('The app dev server is not answering', `${target.upstream}: ${error.message}. Press the app button at the bottom left of the canvas for the log and the fix.`), 'text/html; charset=utf-8', options.studioOrigin);
      else sendText(res, 502, error.message);
    });
    req.pipe(outgoing);
  };

  return {
    projectOf: (req: http.IncomingMessage): string | null => projectIdFromHost(req.headers.host, options.port),
    isApp: options.isApp,

    async handle(req: http.IncomingMessage, res: http.ServerResponse, projectId: string): Promise<void> {
      const pathname = (req.url ?? '/').split('?')[0] ?? '/';
      if (pathname === BRIDGE_SCRIPT_PATH) {
        sendText(res, 200, await options.bridgeScript(), 'text/javascript; charset=utf-8');
        return;
      }
      if (pathname === BRIDGE_CHANGES_PATH) {
        sendText(res, 200, JSON.stringify({ changedAt: null }), 'application/json');
        return;
      }
      let target: AppTarget | null;
      try {
        target = await options.targetFor(projectId);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (isDocumentRequest(req)) sendText(res, 503, messagePage('The app dev server is not running', `${message} Press the app button at the bottom left of the canvas for the log and the fix.`), 'text/html; charset=utf-8', options.studioOrigin);
        else sendText(res, 503, message);
        return;
      }
      if (!target) {
        sendText(res, 404, 'Not found');
        return;
      }
      if (pathname === APP_SOURCE_PATH) {
        await serveSource(req, res, target);
        return;
      }
      const stateId = hostState(req.headers.host);
      const state = stateId && options.stateFor ? await options.stateFor(projectId, stateId).catch(() => null) : null;
      if (state && answerState(req, res, state, isDocumentRequest(req))) return;
      proxyRequest(req, res, target, state);
    },

    async upgrade(req: http.IncomingMessage, socket: Duplex, head: Buffer, projectId: string): Promise<void> {
      const target = await options.targetFor(projectId).catch(() => null);
      if (!target) {
        socket.destroy();
        return;
      }
      const upstream = new URL(target.upstream);
      const connection = net.connect(Number(upstream.port), upstream.hostname, () => {
        const lines = [`${req.method ?? 'GET'} ${req.url ?? '/'} HTTP/${req.httpVersion}`];
        for (let index = 0; index < req.rawHeaders.length; index += 2) {
          const name = req.rawHeaders[index] ?? '';
          const value = req.rawHeaders[index + 1] ?? '';
          const lower = name.toLowerCase();
          if (lower === 'host') lines.push(`${name}: ${upstream.host}`);
          else if (lower === 'origin') lines.push(`${name}: ${upstream.origin}`);
          else lines.push(`${name}: ${value}`);
        }
        connection.write(`${lines.join('\r\n')}\r\n\r\n`);
        if (head.length > 0) connection.write(head);
        socket.pipe(connection).pipe(socket);
      });
      const close = (): void => {
        connection.destroy();
        socket.destroy();
      };
      connection.on('error', close);
      socket.on('error', close);
      connection.on('close', () => socket.destroy());
      socket.on('close', () => connection.destroy());
    },
  };
}

export type AppProxy = ReturnType<typeof createAppProxy>;
