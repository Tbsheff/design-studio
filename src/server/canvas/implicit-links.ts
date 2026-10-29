import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { CanvasFileFrame } from '../../shared/canvas-file.js';
import type { Project } from '../../shared/contracts.js';
import { cleanLinkText, coveredBy, implicitId, upsertLink, withMotion, type LinkMotion, type LinksFile, type PrototypeLink } from '../../shared/links.js';
import { clickCandidates, pageTree, scriptSources, treeAnchors, type PageAnchor } from './html-anchors.js';
import { createRouteScanner, type RouteScanner } from '../app/route-links.js';
import type { CanvasService } from './service.js';

export type { PageAnchor } from './html-anchors.js';
export { htmlAnchors } from './html-anchors.js';

export type AnchorReader = (frame: CanvasFileFrame) => Promise<PageAnchor[]>;

export interface ImplicitDeps {
  canvas: Pick<CanvasService, 'read' | 'links'>;
  project: Project;
  render?: AnchorReader;
  clicks?: ClickReader;
}

export type ClickReader = (frame: CanvasFileFrame, skip: readonly string[]) => Promise<PageAnchor[]>;

const MAX_IMPLICIT = 120;
const CACHE_MS = 15_000;

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

const SCRIPT_FILES_MAX = 6;
const SCRIPT_BYTES_MAX = 200_000;

interface StaticPage {
  anchors: PageAnchor[];
  open: number;
  stamp: string;
}

async function localScripts(workTree: string, file: string, sources: readonly string[]): Promise<string[]> {
  const root = path.resolve(workTree) + path.sep;
  const out: string[] = [];
  for (const src of sources.slice(0, SCRIPT_FILES_MAX)) {
    const clean = src.split(/[?#]/)[0] ?? '';
    const full = clean.startsWith('/') ? path.resolve(workTree, `.${clean}`) : path.resolve(path.dirname(file), clean);
    const text = full.startsWith(root) ? await readFile(full, 'utf8').catch(() => null) : null;
    if (text && text.length <= SCRIPT_BYTES_MAX) out.push(text);
  }
  return out;
}

async function staticPage(project: Project, frame: CanvasFileFrame): Promise<StaticPage | null> {
  const workTree = workTreeOf(project, frame);
  const file = workTree ? pageFile(workTree, frame.path ?? '') : null;
  const html = file ? await readFile(file, 'utf8').catch(() => null) : null;
  if (!workTree || !file || html === null) return null;
  const tree = pageTree(html);
  const scripts = await localScripts(workTree, file, scriptSources(tree));
  const anchors = treeAnchors(tree, scripts);
  const stamp = createHash('sha1').update(html).update(scripts.join('\u0000')).digest('hex');
  return { anchors, open: clickCandidates(tree, anchors), stamp };
}

const probes = new Map<string, Promise<PageAnchor[]>>();

function probedAnchors(clicks: ClickReader, frame: CanvasFileFrame, page: StaticPage): Promise<PageAnchor[]> {
  const key = `${frame.id}\u0000${frame.path ?? ''}\u0000${frame.width}\u0000${page.stamp}`;
  const known = probes.get(key);
  if (known) return known;
  const run = clicks(frame, page.anchors.map((anchor) => anchor.selector)).catch(() => {
    probes.delete(key);
    return [];
  });
  probes.set(key, run);
  if (probes.size > 200) probes.delete(probes.keys().next().value as string);
  return run;
}

function mergeAnchors(own: readonly PageAnchor[], extra: readonly PageAnchor[]): PageAnchor[] {
  const seen = new Set(own.map((anchor) => anchor.selector));
  return [...own, ...extra.filter((anchor) => !seen.has(anchor.selector))];
}

async function htmlLinks(deps: ImplicitDeps, frames: readonly CanvasFileFrame[]): Promise<PrototypeLink[]> {
  const out: PrototypeLink[] = [];
  for (const frame of frames) {
    const page = await staticPage(deps.project, frame);
    if (!page) continue;
    const probed = deps.clicks && page.open > 0 && !frame.hidden ? await probedAnchors(deps.clicks, frame, page) : [];
    out.push(...anchorLinks(frame, mergeAnchors(page.anchors, probed), frames));
  }
  return out;
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
  if (project.kind === 'html' && !project.app) return htmlLinks(deps, frames);
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
