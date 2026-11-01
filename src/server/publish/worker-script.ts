import { pbkdf2Sync, randomBytes } from 'node:crypto';
import type { PublishKind } from '../../shared/publish.js';

export interface PasswordHash {
  salt: string;
  hash: string;
  iter: number;
}

export interface WorkerOptions {
  kind: PublishKind;
  title: string;
  expiresAt: number | null;
  password: PasswordHash | null;
}

const PBKDF2_ITER = 100_000;

export function hashPassword(password: string): PasswordHash {
  const salt = randomBytes(16);
  const hash = pbkdf2Sync(password, salt, PBKDF2_ITER, 32, 'sha256');
  return { salt: salt.toString('hex'), hash: hash.toString('hex'), iter: PBKDF2_ITER };
}

const SITE_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https:",
  "style-src 'self' 'unsafe-inline' https:",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https:",
  "media-src 'self' data: blob: https:",
  "connect-src 'self' https:",
  "frame-src 'self' https:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

const VIEWER_CSP = ["default-src 'none'", "img-src 'self'", "style-src 'self'", "base-uri 'none'", "form-action 'none'", "frame-ancestors 'none'"].join('; ');

export function cspFor(kind: PublishKind): string {
  return kind === 'site' ? SITE_CSP : VIEWER_CSP;
}

const RUNTIME = String.raw`
const enc = new TextEncoder();
const passed = new Set();
const PAGE_CSP = "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";

function bytes(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i += 1) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function toHex(buffer) {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function allowed(header) {
  if (!PASSWORD) return true;
  if (!header || !header.startsWith('Basic ')) return false;
  if (passed.has(header)) return true;
  let secret;
  try {
    const raw = atob(header.slice(6));
    secret = raw.slice(raw.indexOf(':') + 1);
  } catch (error) {
    return false;
  }
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: bytes(PASSWORD.salt), iterations: PASSWORD.iter }, key, 256);
  const got = toHex(bits);
  let diff = got.length ^ PASSWORD.hash.length;
  for (let i = 0; i < got.length && i < PASSWORD.hash.length; i += 1) diff |= got.charCodeAt(i) ^ PASSWORD.hash.charCodeAt(i);
  if (diff !== 0) return false;
  if (passed.size < 64) passed.add(header);
  return true;
}

function secure(response, extra, csp) {
  const headers = new Headers(response.headers);
  headers.set('content-security-policy', csp || CSP);
  headers.set('referrer-policy', 'no-referrer');
  headers.set('x-robots-tag', 'noindex, nofollow, noarchive');
  headers.set('x-content-type-options', 'nosniff');
  headers.set('x-frame-options', 'DENY');
  headers.set('cross-origin-opener-policy', 'same-origin');
  headers.set('permissions-policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
  if (PASSWORD) headers.set('cache-control', 'private, no-store');
  for (const [name, value] of Object.entries(extra || {})) headers.set(name, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (ch) => '&#' + ch.charCodeAt(0) + ';');
}

function page(status, heading, text) {
  const html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>' + escapeHtml(heading) + '</title><style>:root{color-scheme:light dark}body{margin:0;min-height:100vh;display:grid;place-items:center;font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;background:Canvas;color:CanvasText}main{max-width:360px;padding:24px;text-align:center}h1{font-size:16px;margin:0 0 8px}p{margin:0;opacity:.7}</style></head><body><main><h1>' + escapeHtml(heading) + '</h1><p>' + escapeHtml(text) + '</p></main></body></html>';
  return new Response(html, { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method !== 'GET' && request.method !== 'HEAD') return secure(new Response('Method not allowed', { status: 405, headers: { allow: 'GET, HEAD' } }), null, PAGE_CSP);
    if (EXPIRES_AT !== null && Date.now() > EXPIRES_AT) return secure(page(410, 'This link has ended', 'The owner set this design to stop working after a date. Ask them for a new link.'), null, PAGE_CSP);
    if (url.pathname === '/robots.txt') return secure(new Response('User-agent: *\nDisallow: /\n', { headers: { 'content-type': 'text/plain; charset=utf-8' } }), null, PAGE_CSP);
    if (!(await allowed(request.headers.get('authorization')))) return secure(page(401, 'Password needed', 'Enter the password the owner gave you. Any user name works.'), { 'www-authenticate': 'Basic realm="' + TITLE.replace(/["\\]/g, '') + '", charset="UTF-8"' }, PAGE_CSP);
    const response = await env.ASSETS.fetch(request);
    if (response.status === 404) return secure(page(404, 'Page not found', 'This page is not part of the published design.'), null, PAGE_CSP);
    return secure(response);
  },
};
`;

export function workerScript(options: WorkerOptions): string {
  const title = options.title.replace(/[^\p{L}\p{N} ._-]/gu, '').slice(0, 60) || 'Design preview';
  const head = [
    `const CSP = ${JSON.stringify(cspFor(options.kind))};`,
    `const EXPIRES_AT = ${options.expiresAt === null ? 'null' : String(Math.floor(options.expiresAt))};`,
    `const PASSWORD = ${options.password ? JSON.stringify(options.password) : 'null'};`,
    `const TITLE = ${JSON.stringify(title)};`,
  ].join('\n');
  return `${head}\n${RUNTIME.trimStart()}`;
}
