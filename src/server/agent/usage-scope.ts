import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import type { AppRoute, Project } from '../../shared/contracts.js';
import type { ComponentUsage, UsageRoute } from '../../shared/usage-scope.js';
import { appRouterDir, listAppRoutes } from '../app/routes.js';
import { RouteGraph } from '../preview/route-graph.js';
import { BadRequestError, NotFoundError } from '../store/errors.js';

const SEGMENT_FILES = /^(layout|template|loading|error|not-found)\.(tsx|ts|jsx|js)$/;
const SNAPSHOT_MS = 5000;
const EXPORTED_NAME = /export\s+(?:default\s+)?(?:async\s+)?(?:function|const|class)\s+([A-Z][A-Za-z0-9_]*)/;

const graph = new RouteGraph(null);
const snapshots = new Map<string, { at: number | null; snapshot: Promise<AppSnapshot>; next: Promise<AppSnapshot> | null }>();

function posix(file: string): string {
  return file.split(path.sep).join('/');
}

function inside(root: string, file: string): boolean {
  const relative = path.relative(root, file);
  return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
}

export function resolveUsageFile(workTree: string, appDir: string | null, file: string): string {
  const clean = file.trim().replace(/^\/+/, '');
  if (!clean || clean.includes('\0')) throw new BadRequestError('file is required');
  const candidates = [path.resolve(workTree, clean), appDir ? path.resolve(workTree, appDir, clean) : null].filter((item): item is string => item !== null && inside(workTree, item));
  if (!candidates.length) throw new BadRequestError('file must be inside the project folder');
  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) throw new NotFoundError(`${clean} is not a file in the project folder`);
  return found;
}

async function segmentFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  return entries.filter((entry) => entry.isFile() && SEGMENT_FILES.test(entry.name)).map((entry) => path.join(dir, entry.name));
}

async function rootsOf(workTree: string, routerDir: string, route: AppRoute, segments: Map<string, Promise<string[]>>): Promise<string[]> {
  const page = path.join(workTree, route.file);
  const dirs: string[] = [];
  for (let dir = path.dirname(page); dir.startsWith(routerDir); dir = path.dirname(dir)) {
    dirs.push(dir);
    if (dir === routerDir) break;
  }
  const found = await Promise.all(
    dirs.map((dir) => {
      let pending = segments.get(dir);
      if (!pending) {
        pending = segmentFiles(dir);
        segments.set(dir, pending);
      }
      return pending;
    }),
  );
  return [page, ...found.flat()];
}

interface AppSnapshot {
  routes: AppRoute[];
  roots: string[][];
  reverse: Map<string, string[]>;
}

function reverseOf(files: Iterable<[file: string, deps: string[]]>): Map<string, string[]> {
  const reverse = new Map<string, string[]>();
  for (const [file, deps] of files) {
    for (const dep of deps) {
      const list = reverse.get(dep);
      if (list) list.push(file);
      else reverse.set(dep, [file]);
    }
  }
  return reverse;
}

function usersOf(reverse: Map<string, string[]>, target: string): Set<string> {
  const seen = new Set<string>([target]);
  const queue = [target];
  for (let next = queue.pop(); next !== undefined; next = queue.pop()) {
    for (const user of reverse.get(next) ?? []) {
      if (seen.has(user)) continue;
      seen.add(user);
      queue.push(user);
    }
  }
  return seen;
}

async function componentName(file: string): Promise<string | null> {
  const text = await readFile(file, 'utf8').catch(() => '');
  const exported = EXPORTED_NAME.exec(text)?.[1];
  if (exported) return exported;
  const base = path.basename(file).replace(/\.[^.]+$/, '');
  const pascal = base.replace(/(^|[-_.\s]+)([a-zA-Z0-9])/g, (_match, _sep: string, letter: string) => letter.toUpperCase());
  return /^[A-Z]/.test(pascal) ? pascal : null;
}

export type UsageEdges = (workTree: string, roots: string[]) => Promise<[file: string, deps: string[]][]>;

const inProcessEdges: UsageEdges = (workTree, roots) => graph.edges(workTree, roots);

async function buildSnapshot(workTree: string, appDir: string, edges: UsageEdges): Promise<AppSnapshot> {
  const routerDir = appRouterDir(path.join(workTree, appDir));
  if (!routerDir) return { routes: [], roots: [], reverse: new Map() };
  const routes = await listAppRoutes(workTree, appDir);
  const segments = new Map<string, Promise<string[]>>();
  const roots = await Promise.all(routes.map((route) => rootsOf(workTree, routerDir, route, segments)));
  const files = await edges(workTree, [...new Set(roots.flat())]);
  return { routes, roots, reverse: reverseOf(files) };
}

function refresh(key: string, workTree: string, appDir: string, edges: UsageEdges): Promise<AppSnapshot> {
  const snapshot = buildSnapshot(workTree, appDir, edges);
  const known = snapshots.get(key);
  if (known) known.next = snapshot;
  else snapshots.set(key, { at: null, snapshot, next: snapshot });
  snapshot.then(
    () => snapshots.set(key, { at: Date.now(), snapshot, next: null }),
    () => {
      const current = snapshots.get(key);
      if (current?.at === null) snapshots.delete(key);
      else if (current) current.next = null;
    },
  );
  return snapshot;
}

function snapshotOf(workTree: string, appDir: string, edges: UsageEdges): Promise<AppSnapshot> {
  const key = `${workTree}|${appDir}`;
  const known = snapshots.get(key);
  if (!known) return refresh(key, workTree, appDir, edges);
  if (known.at !== null && !known.next && Date.now() - known.at >= SNAPSHOT_MS) void refresh(key, workTree, appDir, edges).catch(() => undefined);
  return known.snapshot;
}

async function appUsage(workTree: string, appDir: string, target: string, edges: UsageEdges): Promise<UsageRoute[]> {
  const { routes, roots, reverse } = await snapshotOf(workTree, appDir, edges);
  const users = usersOf(reverse, target);
  return routes.filter((_route, index) => roots[index]?.some((root) => users.has(root))).map((route) => ({ route: route.route, file: route.file }));
}

export function warmComponentUsage(project: Project, workTree: string, edges: UsageEdges = inProcessEdges): void {
  if (!project.app || snapshots.has(`${workTree}|${project.app.appDir}`)) return;
  void snapshotOf(workTree, project.app.appDir, edges).catch(() => undefined);
}

export async function componentUsage(project: Project, workTree: string, file: string, edges: UsageEdges = inProcessEdges): Promise<ComponentUsage> {
  const target = resolveUsageFile(workTree, project.app?.appDir ?? null, file);
  const relative = posix(path.relative(workTree, target));
  if (!project.app) return { file: relative, component: null, routes: [] };
  const [component, routes] = await Promise.all([componentName(target), appUsage(workTree, project.app.appDir, target, edges)]);
  return { file: relative, component, routes };
}
