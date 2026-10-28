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
  cache?: ScreenCache;
}

export interface ScreenCache {
  stamp: string;
  screens: RunScreen[];
  touchedStamp?: string;
  touched?: string[];
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

export function samePage(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const strip = (url: string) => url.replace(/\/(index\.html?)?(?=[?#]|$)/, '/').replace(/\/(?=[?#]|$)/, '');
  return strip(a) === strip(b);
}

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
  await walk(workTree, '', (file, size, mtimeMs) => parts.push(`${file}:${size}:${mtimeMs}`), { left: 400 });
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
  const stamp = deps.ctx.previewUrl ? await deps.preview.sourceStamp?.(deps.ctx.previewUrl) : null;
  const memo = stamp ? `${stamp}#${deps.startedAt}` : null;
  if (memo && deps.cache?.touchedStamp === memo && deps.cache.touched) return new Set(deps.cache.touched);
  const workTree = deps.ctx.direction.workTree;
  const [routes, changed] = await Promise.all([listAppRoutes(workTree, app.appDir).catch(() => []), changedSince(workTree, app.appDir, deps.startedAt)]);
  const touched = touchedRoutes(routes, changed);
  if (memo && deps.cache) Object.assign(deps.cache, { touchedStamp: memo, touched: [...touched] });
  return touched;
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
    if (!pages.some((known) => samePage(known.url, page.url))) pages.push(page);
  }
  if (!project.app && !pages.some((page) => samePage(page.url, base))) pages.unshift({ label: 'Entry', url: base, pagePath: '' });
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

async function screenStillValid(page: RenderPage, screen: RunScreen): Promise<boolean> {
  if (screen.prepare && !(await page.evaluate<boolean>(screen.prepare).catch(() => false))) return false;
  const now = await page.evaluate<{ signature: string }>(screenSignatureExpression()).catch(() => null);
  return now?.signature === screen.signature;
}

async function stillValid(preview: PreviewService, screens: readonly RunScreen[]): Promise<boolean> {
  const withPage = preview.withPage?.bind(preview);
  if (!withPage) return true;
  const checked = screens.filter((screen) => screen.signature !== undefined && screens.filter((other) => other.url === screen.url).length > 1);
  const valid = await Promise.all(checked.map((screen) => withPage(screen.url, DESKTOP, (page) => screenStillValid(page, screen)).catch(() => false)));
  return valid.every(Boolean);
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
  if (deps.cache?.stamp === stamp) return deps.cache.screens;
  if (deps.cache?.screens.length && deps.cache.stamp.startsWith(`${hash}#${plan.maxScreens}#`) && (await stillValid(deps.preview, deps.cache.screens))) {
    deps.cache.stamp = stamp;
    return deps.cache.screens;
  }
  const screens = await htmlScreens(deps, pages, plan);
  if (deps.cache) Object.assign(deps.cache, { stamp, screens });
  return screens;
}

const warmed = new Map<string, string>();

export async function warmScreens(preview: PreviewService, project: Project, screens: readonly RunScreen[]): Promise<void> {
  const upstream = project.app ? await preview.apps?.ensure(project).catch(() => null) : null;
  if (!upstream) return;
  await Promise.all(
    [...new Set(screens.map((screen) => screen.pagePath))].map(async (pagePath) => {
      const screen = screens.find((item) => item.pagePath === pagePath);
      const stamp = screen ? await preview.sourceStamp?.(screen.url).catch(() => null) : null;
      if (stamp && warmed.get(screen?.url ?? '') === stamp) return;
      const answer = await fetch(new URL(`/${pagePath}`, upstream), { redirect: 'manual', signal: AbortSignal.timeout(WARM_TIMEOUT_MS) }).catch(() => null);
      await answer?.body?.cancel().catch(() => undefined);
      if (stamp && screen) warmed.set(screen.url, stamp);
    }),
  );
}

export function describeScreens(screens: readonly RunScreen[]): string {
  return screens.map((screen, index) => `${index + 1}. ${screen.label}${screen.forced ? ' (shown by the studio without its click path; text that a script fills may be empty)' : ''}${screen.touched ? ' (route you changed)' : ''}`).join('\n');
}
