import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import type { ServerConfig } from '../types.js';

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.wasm': 'application/wasm',
};

const MISSING_BUILD_PAGE = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>Design Studio</title></head>
<body style="font-family: system-ui, sans-serif; padding: 48px; color: #1f2328">
<h1>Design Studio</h1>
<p>The UI is not built yet. Run <code>npm run build:ui</code>, then reload this page.</p>
</body>
</html>
`;

function escapeAttribute(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export async function serveStatic(rootDir: string, requestPath: string): Promise<Response | null> {
  let decoded: string;
  try {
    decoded = decodeURIComponent(requestPath);
  } catch {
    return null;
  }
  if (decoded.includes('\0')) return null;
  const root = path.resolve(rootDir);
  const target = path.resolve(root, `.${path.posix.normalize(`/${decoded}`)}`);
  if (!target.startsWith(root + path.sep)) return null;
  if (path.basename(target) === 'index.html') return null;
  try {
    const info = await stat(target);
    if (!info.isFile()) return null;
  } catch {
    return null;
  }
  const bytes = await readFile(target);
  const type = MIME_TYPES[path.extname(target).toLowerCase()] ?? 'application/octet-stream';
  const immutable = target.includes(`${path.sep}assets${path.sep}`);
  return new Response(new Uint8Array(bytes), {
    headers: {
      'content-type': type,
      'cache-control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
    },
  });
}

export async function renderIndexHtml(rootDir: string, config: ServerConfig): Promise<string> {
  let html: string;
  try {
    html = await readFile(path.join(rootDir, 'index.html'), 'utf8');
  } catch {
    return MISSING_BUILD_PAGE;
  }
  const meta =
    `<meta name="studio-token" content="${escapeAttribute(config.studioToken)}">` +
    `<meta name="studio-preview-origin" content="${escapeAttribute(config.previewOrigin)}">`;
  const headOpen = /<head[^>]*>/i.exec(html);
  if (!headOpen) return `${meta}${html}`;
  const insertAt = headOpen.index + headOpen[0].length;
  return `${html.slice(0, insertAt)}${meta}${html.slice(insertAt)}`;
}
