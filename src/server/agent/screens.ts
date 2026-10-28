import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import type { CanvasFileFrame } from '../../shared/canvas-file.js';
import type { AppRoute, Project } from '../../shared/contracts.js';
import { DEFAULT_FRAME_STATE, stateLabel, withFrameStateHost, type FrameStatesView } from '../../shared/frame-state.js';
import type { ScreenPlan } from '../../shared/run-levels.js';
import { stateOfFrame } from '../app/frame-state.js';
import { configuredFrameStates, readFrameStates } from '../app/frame-state-service.js';
import { listAppRoutes } from '../app/routes.js';
import type { CanvasService } from '../canvas/service.js';
import { withPagePath } from '../export/source.js';
import type { RenderPage } from '../preview/render-backend.js';
import { exploreScreens, replayExpression } from '../preview/screens.js';
import { screenSignatureExpression } from '../preview/screens-probe.js';
import type { AgentRunContext, PreviewService } from '../types.js';

export interface RunScreen {
  key?: string;
  signature?: string;
  label: string;
  url: string;
  pagePath: string;
  prepare?: string;
  forced?: boolean;
  touched?: boolean;
}

export interface ScreenDeps {
  preview: PreviewService;
  ctx: AgentRunContext;
  canvas?: CanvasService;
  startedAt?: number;
  cache?: { stamp: string; screens: RunScreen[] };
}

interface PageRef {
  label: string;
  url: string;
  pagePath: string;
  frameId?: string;
  touched?: boolean;
}

const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', 'out', 'coverage']);
const SOURCE_FILE = /\.(tsx?|jsx?|css|scss|mdx?|html)$/;
const WALK_CAP = 6000;
const EXPLORE_PAGES = 3;
const EXPLORE_MS = 12_000;
const EXPLORE_CLICKS = 40;
const WARM_TIMEOUT_MS = 120_000;
const DESKTOP = { width: 1440, height: 900 };

export const DEFAULT_SCREEN_PLAN: ScreenPlan = { maxScreens: 1, maxImages: 5, checkScreens: 0 };

async function walk(root: string, dir: string, visit: (file: string, size: number, mtimeMs: number) => void, budget: { left: number }): Promise<void> {
  const entries = await readdir(path.join(root, dir), { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    if (budget.left-- <= 0) return;
    const rel = dir ? `${dir}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      if (!entry.name.startsWith('.') && !SKIP_DIRS.has(entry.name)) await walk(root, rel, visit, budget);
    } else if (entry.isFile() && SOURCE_FILE.test(entry.name)) {
      const info = await stat(path.join(root, rel)).catch(() => null);
      if (info) visit(rel, info.size, info.mtimeMs);
    }
  }
}

export async function changedSince(workTree: string, dir: string, since: number): Promise<string[]> {
  const changed: string[] = [];
  await walk(workTree, dir.replace(/^\/+|\/+$/g, ''), (file, _size, mtimeMs) => mtimeMs >= since && changed.push(file), { left: WALK_CAP });
  return changed.sort();
}

async function fileStamp(workTree: string): Promise<string> {
  const parts: string[] = [];
  await walk(workTree, '', (file) => parts.push(file), { left: 400 });
  return parts.sort().join('|');
}

function ownFrames(frames: readonly CanvasFileFrame[], directionId: string): CanvasFileFrame[] {
  return frames.filter((frame) => !frame.hidden && (frame.directionId ?? directionId) === directionId).sort((a, b) => a.order - b.order);
}

async function frameStates(project: Project): Promise<FrameStatesView | null> {
  const deps = project.app ? configuredFrameStates() : null;
  return deps ? readFrameStates(deps, project).catch(() => null) : null;
}

function framePage(base: string, frame: CanvasFileFrame, view: FrameStatesView | null): PageRef {
  const stateId = view ? stateOfFrame(view, frame.id) : DEFAULT_FRAME_STATE;
  const state = stateId === DEFAULT_FRAME_STATE ? null : stateLabel(view, stateId);
  const name = frame.label ?? (frame.path ? `/${frame.path}` : 'Entry');
  return { label: state ? `${name} (${state})` : name, url: withFrameStateHost(withPagePath(base, frame.path || undefined), stateId), pagePath: frame.path ?? '', frameId: frame.id };
}

async function touchedPaths(deps: ScreenDeps): Promise<Set<string>> {
  const app = deps.ctx.project.app;
  if (!app || deps.startedAt === undefined) return new Set();
  const workTree = deps.ctx.direction.workTree;
  const [routes, changed] = await Promise.all([listAppRoutes(workTree, app.appDir).catch(() => []), changedSince(workTree, app.appDir, deps.startedAt)]);
  return touchedRoutes(routes, changed);
}

export function touchedRoutes(routes: readonly AppRoute[], changed: readonly string[]): Set<string> {
  const dirs = routes.map((route) => ({ route: route.route.replace(/^\/+/, ''), dir: `${path.posix.dirname(route.file)}/` })).sort((a, b) => b.dir.length - a.dir.length);
  const touched = new Set<string>();
  for (const file of changed) {
    const owner = dirs.find((entry) => file.startsWith(entry.dir));
    if (owner) touched.add(owner.route);
  }
  return touched;
}

function rankApp(pages: PageRef[], touched: Set<string>, activeId: string | undefined): PageRef[] {
  const score = (page: PageRef) => (page.touched ? 0 : page.frameId && page.frameId === activeId ? 1 : 2);
  return pages.map((page) => ({ ...page, touched: touched.has(page.pagePath.split('?')[0]?.replace(/\/+$/, '') ?? '') })).sort((a, b) => score(a) - score(b));
}

async function canvasPages(deps: ScreenDeps): Promise<{ pages: PageRef[]; hash: string }> {
  const { project, direction } = deps.ctx;
  const base = deps.ctx.previewUrl as string;
  const snapshot = deps.canvas ? await deps.canvas.read(project).catch(() => null) : null;
  const frames = ownFrames(snapshot?.canvas?.frames ?? [], direction.id);
  const view = await frameStates(project);
  const pages: PageRef[] = [];
  for (const frame of frames) {
    const page = framePage(base, frame, view);
    if (!pages.some((known) => known.url === page.url)) pages.push(page);
  }
  if (!project.app && !pages.some((page) => page.pagePath === '')) pages.unshift({ label: 'Entry', url: base, pagePath: '' });
  if (pages.length === 0) pages.push({ label: 'Entry', url: base, pagePath: '' });
  if (!project.app) return { pages, hash: snapshot?.hash ?? '' };
  const presence = deps.canvas?.presence(project.id);
  const active = presence?.directionId === direction.id ? presence.activeFrameId : undefined;
  return { pages: rankApp(pages, await touchedPaths(deps), active ?? undefined), hash: snapshot?.hash ?? '' };
}

function screenName(page: PageRef, label: string, single: boolean): string {
  if (!label) return page.label;
  return single ? label : `${page.label}: ${label}`;
}

async function explorePage(deps: ScreenDeps, page: PageRef, room: number, single: boolean): Promise<RunScreen[]> {
  const withPage = deps.preview.withPage?.bind(deps.preview);
  if (!withPage || room <= 1) return [{ label: page.label, url: page.url, pagePath: page.pagePath }];
  const found = await withPage(page.url, DESKTOP, (rendered) => exploreScreens(rendered, { maxScreens: room, maxClicks: EXPLORE_CLICKS, deadlineMs: EXPLORE_MS })).catch(() => []);
  if (found.length === 0) return [{ label: page.label, url: page.url, pagePath: page.pagePath }];
  return found.map((screen) => ({
    key: `${page.url}|${screen.signature}`,
    signature: screen.signature,
    label: screenName(page, screen.label, single && found.length > 1),
    url: page.url,
    pagePath: page.pagePath,
    ...(screen.steps.length ? { prepare: replayExpression(screen.steps) } : {}),
    ...(screen.forced ? { forced: true } : {}),
  }));
}

async function pageStillValid(page: RenderPage, screens: readonly RunScreen[]): Promise<boolean> {
  const href = await page.evaluate<string>('location.href');
  for (const [index, screen] of screens.entries()) {
    if (index > 0) await page.goto(href);
    if (screen.prepare && !(await page.evaluate<boolean>(screen.prepare).catch(() => false))) return false;
    const now = await page.evaluate<{ signature: string }>(screenSignatureExpression()).catch(() => null);
    if (screen.signature !== undefined && now?.signature !== screen.signature) return false;
  }
  return true;
}

async function stillValid(preview: PreviewService, screens: readonly RunScreen[]): Promise<boolean> {
  const withPage = preview.withPage?.bind(preview);
  if (!withPage) return true;
  for (const url of new Set(screens.map((screen) => screen.url))) {
    const group = screens.filter((screen) => screen.url === url && screen.signature !== undefined);
    if (group.length > 1 && !(await withPage(url, DESKTOP, (page) => pageStillValid(page, group)).catch(() => false))) return false;
  }
  return true;
}

async function htmlScreens(deps: ScreenDeps, pages: PageRef[], plan: ScreenPlan): Promise<RunScreen[]> {
  const screens: RunScreen[] = [];
  for (const [index, page] of pages.entries()) {
    const room = plan.maxScreens - screens.length - Math.max(0, Math.min(pages.length, plan.maxScreens) - index - 1);
    if (room <= 0) break;
    if (index >= EXPLORE_PAGES) screens.push({ label: page.label, url: page.url, pagePath: page.pagePath });
    else screens.push(...(await explorePage(deps, page, room, pages.length === 1)));
  }
  return screens.slice(0, plan.maxScreens);
}

export async function planScreens(deps: ScreenDeps, plan: ScreenPlan): Promise<RunScreen[]> {
  if (!deps.ctx.previewUrl) return [];
  const { pages, hash } = await canvasPages(deps);
  if (deps.ctx.project.app) return pages.slice(0, plan.maxScreens).map((page) => ({ key: page.url, label: page.label, url: page.url, pagePath: page.pagePath, ...(page.touched ? { touched: true } : {}) }));
  const stamp = `${hash}#${plan.maxScreens}#${await fileStamp(deps.ctx.direction.workTree)}`;
  if (deps.cache?.stamp === stamp && (await stillValid(deps.preview, deps.cache.screens))) return deps.cache.screens;
  const screens = await htmlScreens(deps, pages, plan);
  if (deps.cache) Object.assign(deps.cache, { stamp, screens });
  return screens;
}

export async function warmScreens(preview: PreviewService, project: Project, screens: readonly RunScreen[]): Promise<void> {
  const upstream = project.app ? await preview.apps?.ensure(project).catch(() => null) : null;
  if (!upstream) return;
  for (const pagePath of new Set(screens.map((screen) => screen.pagePath))) {
    const answer = await fetch(new URL(`/${pagePath}`, upstream), { redirect: 'manual', signal: AbortSignal.timeout(WARM_TIMEOUT_MS) }).catch(() => null);
    await answer?.body?.cancel().catch(() => undefined);
  }
}

export function describeScreens(screens: readonly RunScreen[]): string {
  return screens.map((screen, index) => `${index + 1}. ${screen.label}${screen.forced ? ' (shown by the studio without its click path; text that a script fills may be empty)' : ''}${screen.touched ? ' (route you changed)' : ''}`).join('\n');
}
