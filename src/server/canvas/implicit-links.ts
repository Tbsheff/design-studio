import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { CanvasFileFrame } from '../../shared/canvas-file.js';
import type { Project } from '../../shared/contracts.js';
import { cleanLinkSelector, cleanLinkText, coveredBy, implicitId, LINK_TEXT_MAX, upsertLink, withMotion, type LinkMotion, type LinksFile, type PrototypeLink } from '../../shared/links.js';
import { createRouteScanner, type RouteScanner } from '../app/route-links.js';
import type { CanvasService } from './service.js';

export interface PageAnchor {
  href: string;
  selector: string;
  tag: string;
  text?: string;
  label?: string;
}

export type AnchorReader = (frame: CanvasFileFrame) => Promise<PageAnchor[]>;

export interface ImplicitDeps {
  canvas: Pick<CanvasService, 'read' | 'links'>;
  project: Project;
  render?: AnchorReader;
}

const MAX_ANCHORS = 60;
const MAX_IMPLICIT = 120;
const CACHE_MS = 15_000;
const SOURCE_TAGS = 'a|button|div|li|span|article|section|tr|td|img|label';
const OPEN_RE = new RegExp(`<(${SOURCE_TAGS})\\b([^>]*)>`, 'gi');
const ATTR_RE = /([:@\w-]+)\s*=\s*("([^"]*)"|'([^']*)')/g;
const LOCATION_RE = /(?:window\.)?location(?:\.href)?\s*=\s*['"]([^'"]+)['"]|location\.(?:assign|replace)\(\s*['"]([^'"]+)['"]/;
const ID_RE = /^[A-Za-z_][\w-]*$/;

function attributes(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const match of raw.matchAll(ATTR_RE)) out[(match[1] as string).toLowerCase()] = match[3] ?? match[4] ?? '';
  return out;
}

function decode(text: string): string {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)));
}

function innerText(html: string, start: number, tag: string): string {
  const end = html.toLowerCase().indexOf(`</${tag.toLowerCase()}>`, start);
  const inner = html.slice(start, end < 0 ? start + 2000 : end);
  return decode(inner.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim().slice(0, LINK_TEXT_MAX);
}

function cssString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

interface RawAnchor {
  href: string;
  tag: string;
  id: string | null;
  attr: 'href' | 'onclick';
  raw: string;
  text: string;
}

function rawAnchor(tag: string, attrs: Record<string, string>, text: string): RawAnchor | null {
  const id = attrs.id && ID_RE.test(attrs.id) ? attrs.id : null;
  if (tag === 'a' && attrs.href) return { href: attrs.href, tag, id, attr: 'href', raw: attrs.href, text };
  const click = attrs.onclick ? LOCATION_RE.exec(attrs.onclick) : null;
  const href = click?.[1] ?? click?.[2];
  return href ? { href, tag, id, attr: 'onclick', raw: href, text } : null;
}

function selectorOf(anchor: RawAnchor): string {
  if (anchor.id) return `#${anchor.id}`;
  return anchor.attr === 'href' ? `a[href="${cssString(anchor.raw)}"]` : `${anchor.tag}[onclick*="${cssString(anchor.raw)}"]`;
}

export function htmlAnchors(html: string): PageAnchor[] {
  const found: RawAnchor[] = [];
  for (const match of html.matchAll(OPEN_RE)) {
    const tag = (match[1] as string).toLowerCase();
    const anchor = rawAnchor(tag, attributes(match[2] ?? ''), innerText(html, (match.index ?? 0) + match[0].length, tag));
    if (anchor) found.push(anchor);
    if (found.length >= MAX_ANCHORS) break;
  }
  const counts = new Map<string, number>();
  for (const anchor of found) counts.set(selectorOf(anchor), (counts.get(selectorOf(anchor)) ?? 0) + 1);
  return found.flatMap((anchor) => {
    const selector = cleanLinkSelector(selectorOf(anchor));
    if (!selector) return [];
    const name = cleanLinkText(anchor.text);
    const text = (counts.get(selector) ?? 0) > 1 ? name : null;
    return [{ href: anchor.href, selector, tag: anchor.tag, ...(text ? { text } : name ? { label: name } : {}) }];
  });
}

export function pageKey(pagePath: string): string {
  return pagePath
    .replace(/^\/+/, '')
    .replace(/(^|\/)index\.html?$/i, '$1')
    .replace(/\.html?$/i, '')
    .replace(/\/+$/, '');
}

export function hrefTarget(fromPath: string, href: string): string | null {
  const value = href.trim();
  if (value === '' || /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(value)) return null;
  try {
    const url = new URL(value, `http://page.invalid/${fromPath.replace(/^\/+/, '')}`);
    if (url.host !== 'page.invalid') return null;
    return decodeURIComponent(url.pathname).replace(/^\/+/, '');
  } catch {
    return null;
  }
}

function directionOf(frame: CanvasFileFrame, frames: readonly CanvasFileFrame[]): string {
  return frame.directionId ?? frames.find((item) => item.directionId)?.directionId ?? '';
}

function targetFrame(from: CanvasFileFrame, key: string, frames: readonly CanvasFileFrame[]): CanvasFileFrame | null {
  const dir = directionOf(from, frames);
  const matches = frames.filter((frame) => frame.id !== from.id && pageKey(frame.path ?? '') === key && (frame.directionId ?? dir) === dir);
  const shown = matches.filter((frame) => !frame.hidden);
  const pool = shown.length > 0 ? shown : matches;
  return pool.find((frame) => frame.width === from.width) ?? pool[0] ?? null;
}

function linkFrom(from: CanvasFileFrame, to: CanvasFileFrame, anchor: Omit<PageAnchor, 'href'>): PrototypeLink {
  const label = anchor.text ? null : cleanLinkText(anchor.label);
  const source = { frame: from.id, path: from.path ?? '', selector: anchor.selector, tag: anchor.tag, ...(anchor.text ? { text: anchor.text } : {}), ...(label ? { label } : {}) };
  return { id: implicitId(source), from: source, to: { frame: to.id }, transition: 'instant', implicit: true };
}

export function anchorLinks(from: CanvasFileFrame, anchors: readonly PageAnchor[], frames: readonly CanvasFileFrame[]): PrototypeLink[] {
  const own = pageKey(from.path ?? '');
  const out: PrototypeLink[] = [];
  for (const anchor of anchors) {
    const target = hrefTarget(from.path ?? '', anchor.href);
    if (target === null || pageKey(target) === own) continue;
    const to = targetFrame(from, pageKey(target), frames);
    if (to) out.push(linkFrom(from, to, anchor));
  }
  return out;
}

function workTreeOf(project: Project, frame: CanvasFileFrame): string | null {
  const direction = project.directions.find((item) => item.id === frame.directionId) ?? project.directions[0];
  return direction?.workTree ?? null;
}

function pageFile(workTree: string, framePath: string): string | null {
  const clean = framePath.replace(/^\/+/, '');
  const file = clean === '' || clean.endsWith('/') ? `${clean}index.html` : /\.html?$/i.test(clean) ? clean : `${clean}.html`;
  const full = path.resolve(workTree, file);
  return full.startsWith(path.resolve(workTree) + path.sep) ? full : null;
}

async function staticAnchors(project: Project, frame: CanvasFileFrame): Promise<PageAnchor[]> {
  const workTree = workTreeOf(project, frame);
  const file = workTree ? pageFile(workTree, frame.path ?? '') : null;
  const html = file ? await readFile(file, 'utf8').catch(() => null) : null;
  return html ? htmlAnchors(html) : [];
}

const scanners = new Map<string, { at: number; scanner: Promise<RouteScanner | null> }>();

function scannerOf(project: Project): Promise<RouteScanner | null> {
  const main = project.directions[0];
  if (!project.app || !main) return Promise.resolve(null);
  const key = `${main.workTree}\u0000${project.app.appDir}`;
  const cached = scanners.get(key);
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.scanner;
  const scanner = createRouteScanner(main.workTree, project.app.appDir).catch(() => null);
  scanners.set(key, { at: Date.now(), scanner });
  return scanner;
}

async function nextLinks(project: Project, frames: readonly CanvasFileFrame[]): Promise<PrototypeLink[]> {
  const scanner = await scannerOf(project);
  if (!scanner) return [];
  const routeOf = new Map(frames.map((frame) => [frame.id, scanner.match(`/${frame.path ?? ''}`)]));
  const out: PrototypeLink[] = [];
  for (const from of frames) {
    const route = routeOf.get(from.id);
    if (!route) continue;
    const scan = await scanner.scan(route).catch(() => null);
    for (const link of scan?.links ?? []) {
      const to = link.element && link.to && link.to !== route ? frames.find((frame) => frame.id !== from.id && routeOf.get(frame.id) === link.to && !frame.hidden) : undefined;
      if (to && link.element) out.push(linkFrom(from, to, link.element));
    }
  }
  return out;
}

async function renderedLinks(render: AnchorReader, frames: readonly CanvasFileFrame[]): Promise<PrototypeLink[]> {
  const out: PrototypeLink[] = [];
  for (const frame of frames.filter((item) => !item.hidden)) {
    const anchors = await render(frame).catch(() => []);
    out.push(...anchorLinks(frame, anchors, frames));
  }
  return out;
}

async function pageLinks(deps: ImplicitDeps, frames: readonly CanvasFileFrame[]): Promise<PrototypeLink[]> {
  const { project } = deps;
  if (project.app?.framework === 'next') return nextLinks(project, frames);
  if (project.kind === 'html' && !project.app) {
    const out: PrototypeLink[] = [];
    for (const frame of frames) out.push(...anchorLinks(frame, await staticAnchors(project, frame), frames));
    return out;
  }
  return deps.render ? renderedLinks(deps.render, frames) : [];
}

const cache = new Map<string, { at: number; links: Promise<PrototypeLink[]> }>();

function framesKey(project: Project, frames: readonly CanvasFileFrame[]): string {
  return `${project.id}\u0000${frames.map((frame) => `${frame.id}:${frame.path ?? ''}:${frame.width}:${frame.hidden ? 1 : 0}`).join(',')}`;
}

function uniqueLinks(links: PrototypeLink[]): PrototypeLink[] {
  const seen = new Set<string>();
  return links.filter((link) => (seen.has(link.id) ? false : (seen.add(link.id), true))).slice(0, MAX_IMPLICIT);
}

export function forgetImplicit(projectId: string): void {
  for (const key of cache.keys()) if (key.startsWith(`${projectId}\u0000`)) cache.delete(key);
}

export async function implicitLinks(deps: ImplicitDeps, file?: LinksFile): Promise<PrototypeLink[]> {
  const frames = (await deps.canvas.read(deps.project)).canvas?.frames ?? [];
  if (frames.length < 2) return [];
  const stored = file ?? (await deps.canvas.links.read(deps.project));
  const key = framesKey(deps.project, frames);
  const slow = deps.project.kind !== 'html' || !!deps.project.app;
  const hit = cache.get(key);
  let links: Promise<PrototypeLink[]>;
  if (slow && hit && Date.now() - hit.at < CACHE_MS) links = hit.links;
  else {
    links = pageLinks(deps, frames).then(uniqueLinks);
    if (slow) cache.set(key, { at: Date.now(), links });
  }
  return (await links).filter((link) => !coveredBy(stored.links, link));
}

export interface KeepResult {
  kept: PrototypeLink[];
  missing: string[];
  file: LinksFile;
}

export async function keepImplicit(deps: ImplicitDeps, ids: readonly string[] | 'all', source: 'user' | 'agent', motion: LinkMotion = {}): Promise<KeepResult> {
  const found = await implicitLinks(deps);
  const picked = ids === 'all' ? found : found.filter((link) => ids.includes(link.id));
  const missing = ids === 'all' ? [] : ids.filter((id) => !found.some((link) => link.id === id));
  const kept: PrototypeLink[] = [];
  const file = await deps.canvas.links.update(
    deps.project,
    (current) => {
      let next = current;
      for (const link of picked) {
        const { id: _id, implicit: _implicit, ...rest } = link;
        const done = upsertLink(next, withMotion(rest, motion));
        next = done.file;
        kept.push(done.link);
      }
      return kept.length > 0 ? next : null;
    },
    source,
  );
  return { kept, missing, file };
}
