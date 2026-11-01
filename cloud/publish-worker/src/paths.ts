import { bad } from './http';
import { LIMITS } from './protocol';

const TYPES: Record<string, string> = {
  html: 'text/html; charset=utf-8',
  htm: 'text/html; charset=utf-8',
  css: 'text/css; charset=utf-8',
  js: 'text/javascript; charset=utf-8',
  mjs: 'text/javascript; charset=utf-8',
  json: 'application/json; charset=utf-8',
  webmanifest: 'application/manifest+json; charset=utf-8',
  txt: 'text/plain; charset=utf-8',
  svg: 'image/svg+xml',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif',
  ico: 'image/x-icon',
  woff: 'font/woff',
  woff2: 'font/woff2',
  ttf: 'font/ttf',
  otf: 'font/otf',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
};

export function contentTypeOf(path: string): string | null {
  const ext = path.slice(path.lastIndexOf('.') + 1).toLowerCase();
  return TYPES[ext] ?? null;
}

const SEGMENT_BAD = /[\u0000-\u001f\u007f\\]/;

function checkSegments(segments: string[]): void {
  for (const segment of segments) {
    if (segment === '.' || segment === '..') throw bad('This path is not allowed.', 'bad_path');
    if (SEGMENT_BAD.test(segment) || segment.includes('/') || segment.startsWith('.')) throw bad('This path is not allowed.', 'bad_path');
  }
}

export function decodeRest(raw: string): string {
  if (raw.length > LIMITS.maxPathLength * 3) throw bad('This path is too long.', 'bad_path');
  if (/%2f|%5c|%00|%2e/i.test(raw)) throw bad('This path is not allowed.', 'bad_path');
  let text: string;
  try {
    text = decodeURIComponent(raw);
  } catch {
    throw bad('This path is not allowed.', 'bad_path');
  }
  if (/%[0-9a-f]{2}/i.test(text)) throw bad('This path is not allowed.', 'bad_path');
  const segments = text.split('/');
  checkSegments(segments.slice(0, -1).concat(segments.at(-1) === '' ? [] : [segments.at(-1) as string]));
  return text;
}

export function manifestPathOk(path: string): boolean {
  if (path.length === 0 || path.length > LIMITS.maxPathLength || path.startsWith('/') || path.endsWith('/')) return false;
  const segments = path.split('/');
  try {
    checkSegments(segments);
  } catch {
    return false;
  }
  return segments.every((s) => s.length > 0) && contentTypeOf(path) !== null;
}

export function candidates(rest: string): string[] {
  if (rest === '' || rest.endsWith('/')) return [`${rest}index.html`];
  const last = rest.slice(rest.lastIndexOf('/') + 1);
  if (last.includes('.')) return [rest];
  return [`${rest}.html`, `${rest}/index.html`];
}
