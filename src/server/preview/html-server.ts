import { Hono } from 'hono';
import type { Context } from 'hono';
import { serve } from '@hono/node-server';
import type { ServerType } from '@hono/node-server';
import { readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { BRIDGE_SCRIPT_PATH, projectPreviewHost } from '../../shared/contracts.js';
import { injectForPreview } from '../design-system/html-link.js';
import { annotateHtml } from './annotate.js';

export type RootKind = 'direction' | 'snapshot';

interface HtmlServerOptions {
  port: number;
  studioOrigin: string;
  hostname?: string;
  bridgeScript: () => Promise<string>;
  resolveRoot: (kind: RootKind, projectId: string, key: string) => Promise<string | null>;
}

export interface HtmlServer {
  close(): Promise<void>;
}

const SAFE_ID = /^[A-Za-z0-9_.-]+$/;

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.pdf': 'application/pdf',
};

function frameAncestors(studioOrigin: string): string {
  const origins = new Set([studioOrigin, 'http://127.0.0.1:5173', 'http://localhost:5173']);
  return `frame-ancestors ${[...origins].join(' ')}`;
}

function hostMatchesProject(hostHeader: string | undefined, projectId: string, port: number): boolean {
  if (!hostHeader) return false;
  return hostHeader.toLowerCase() === `${projectPreviewHost(projectId)}:${port}`;
}

function isInside(root: string, target: string): boolean {
  const relative = path.relative(root, target);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function decodeRelative(rawPath: string): string | null {
  const segments: string[] = [];
  for (const segment of rawPath.split('/')) {
    if (segment === '') continue;
    let decoded: string;
    try {
      decoded = decodeURIComponent(segment);
    } catch {
      return null;
    }
    if (decoded === '.' || decoded === '..' || decoded.includes('/') || decoded.includes('\\') || decoded.includes('\0')) {
      return null;
    }
    segments.push(decoded);
  }
  return segments.join('/');
}

async function resolveFile(root: string, relative: string): Promise<{ file: string; relative: string } | null> {
  let rootReal: string;
  try {
    rootReal = await realpath(root);
  } catch {
    return null;
  }
  let candidate = path.resolve(rootReal, relative);
  let candidateRelative = relative;
  if (!isInside(rootReal, candidate)) return null;
  try {
    let real = await realpath(candidate);
    if (!isInside(rootReal, real)) return null;
    let info = await stat(real);
    if (info.isDirectory()) {
      candidate = path.join(candidate, 'index.html');
      candidateRelative = candidateRelative ? `${candidateRelative}/index.html` : 'index.html';
      real = await realpath(candidate);
      if (!isInside(rootReal, real)) return null;
      info = await stat(real);
    }
    if (!info.isFile()) return null;
    return { file: real, relative: candidateRelative };
  } catch {
    return null;
  }
}

function listenOn(app: Hono, port: number, hostname: string): Promise<ServerType> {
  return new Promise<ServerType>((resolve, reject) => {
    const instance = serve({ fetch: app.fetch, port, hostname }, () => resolve(instance));
    instance.once('error', reject);
  });
}

function closeServer(server: ServerType): Promise<void> {
  return new Promise<void>((resolve) => {
    const closable = server as ServerType & { closeAllConnections?: () => void };
    closable.closeAllConnections?.();
    server.close(() => resolve());
  });
}

export async function startHtmlServer(options: HtmlServerOptions): Promise<HtmlServer> {
  const app = new Hono();
  const securityHeaders = {
    'content-security-policy': frameAncestors(options.studioOrigin),
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer',
    'cross-origin-resource-policy': 'same-origin',
  };

  app.get(BRIDGE_SCRIPT_PATH, async (c) => {
    const script = await options.bridgeScript();
    return c.body(script, 200, {
      ...securityHeaders,
      'content-type': 'text/javascript; charset=utf-8',
      'cache-control': 'no-store',
    });
  });

  const serveFrom = async (c: Context, kind: RootKind, projectId: string, key: string, prefix: string) => {
    if (!SAFE_ID.test(projectId) || !SAFE_ID.test(key)) return c.text('Not found', 404, securityHeaders);
    if (!hostMatchesProject(c.req.header('host'), projectId, options.port)) {
      return c.text('This preview origin does not belong to that project', 403, securityHeaders);
    }
    const root = await options.resolveRoot(kind, projectId, key).catch(() => null);
    if (!root) return c.text('Not found', 404, securityHeaders);
    const relative = decodeRelative(c.req.path.slice(prefix.length));
    if (relative === null) return c.text('Bad path', 400, securityHeaders);
    const resolved = await resolveFile(root, relative || 'index.html');
    if (!resolved) return c.text('Not found', 404, securityHeaders);
    const extension = path.extname(resolved.file).toLowerCase();
    const contentType = CONTENT_TYPES[extension] ?? 'application/octet-stream';
    const headers = { ...securityHeaders, 'content-type': contentType, 'cache-control': 'no-store' };
    if (extension === '.html' || extension === '.htm') {
      const source = await readFile(resolved.file, 'utf8');
      const annotated = annotateHtml(source, resolved.relative);
      return c.body(await injectForPreview(root, resolved.relative, annotated), 200, headers);
    }
    const bytes = await readFile(resolved.file);
    return c.body(new Uint8Array(bytes), 200, headers);
  };

  app.get('/d/:pid/:did/*', (c) => {
    const pid = c.req.param('pid');
    const did = c.req.param('did');
    return serveFrom(c, 'direction', pid, did, `/d/${pid}/${did}`);
  });

  app.get('/s/:pid/:sha/*', (c) => {
    const pid = c.req.param('pid');
    const sha = c.req.param('sha');
    return serveFrom(c, 'snapshot', pid, sha, `/s/${pid}/${sha}`);
  });

  app.notFound((c) => c.text('Not found', 404, securityHeaders));
  app.onError((_error, c) => c.text('Preview error', 500, securityHeaders));

  const primary = await listenOn(app, options.port, options.hostname ?? '127.0.0.1');
  const port = (primary.address() as { port?: number } | null)?.port ?? options.port;
  const loopbackV6 = await listenOn(app, port, '::1').catch(() => null);
  const servers = loopbackV6 ? [primary, loopbackV6] : [primary];

  return {
    close: async () => {
      await Promise.all(servers.map(closeServer));
    },
  };
}
