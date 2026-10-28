import { readdir } from 'node:fs/promises';
import path from 'node:path';
import type { AppRoute } from '../../shared/contracts.js';
import { matchRouteFile } from '../agent/run-target.js';
import { appRouterDir, listAppRoutes } from '../app/routes.js';
import { siblingWorkerFile, WorkerClient } from '../worker-client.js';
import { RouteGraph, type ContentStamp } from './route-graph.js';
import type { GraphRequest } from './route-graph-worker.js';

export type { ContentStamp } from './route-graph.js';

const SEGMENT_FILES = /^(layout|template|loading|error|not-found)\.(tsx|ts|jsx|js)$/;
const GLOBAL_FILES = /^(next\.config|tailwind\.config|postcss\.config|middleware|proxy|instrumentation)\.(ts|js|mjs|cjs)$|^\.env(\..+)?$|^package\.json$|^tsconfig\.json$/;
const ROUTES_MS = 3000;
const FIRST_WAIT_MS = 400;
const WORKER_FILE = siblingWorkerFile(import.meta.url, 'route-graph-worker');

async function filesIn(dir: string, pattern: RegExp): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  return entries.filter((entry) => entry.isFile() && pattern.test(entry.name)).map((entry) => path.join(dir, entry.name));
}

export class RouteStamps {
  private readonly routes = new Map<string, { at: number; list: Promise<AppRoute[]> }>();
  private readonly built = new Set<string>();
  private readonly building = new Map<string, Promise<ContentStamp | null>>();
  private readonly graph: WorkerClient<GraphRequest, ContentStamp | null>;

  constructor(cacheDir: string | null = null) {
    const inProcess = new RouteGraph(cacheDir);
    this.graph = new WorkerClient({
      file: WORKER_FILE,
      label: 'route graph',
      workerData: { cacheDir },
      inProcess: async (request) => (request.kind === 'flush' ? (await inProcess.flush(), null) : inProcess.stamp(request.workTree, request.roots)),
    });
  }

  private routeList(workTree: string, appDir: string): Promise<AppRoute[]> {
    const key = `${workTree}|${appDir}`;
    const known = this.routes.get(key);
    if (known && Date.now() - known.at < ROUTES_MS) return known.list;
    const list = listAppRoutes(workTree, appDir).catch(() => []);
    this.routes.set(key, { at: Date.now(), list });
    return list;
  }

  async stamp(workTree: string, appDir: string, pathname: string): Promise<ContentStamp | null> {
    const key = `${workTree}|${appDir}|${pathname}`;
    if (this.built.has(key)) return this.compute(workTree, appDir, pathname);
    let pending = this.building.get(key);
    if (!pending) {
      pending = this.compute(workTree, appDir, pathname).catch(() => null).finally(() => {
        this.building.delete(key);
        this.built.add(key);
      });
      this.building.set(key, pending);
    }
    return Promise.race([pending, new Promise<null>((resolve) => setTimeout(() => resolve(null), FIRST_WAIT_MS).unref())]);
  }

  async close(): Promise<void> {
    if (this.graph.started) await this.graph.run({ kind: 'flush' }).catch(() => null);
    await this.graph.close();
  }

  private async compute(workTree: string, appDir: string, pathname: string): Promise<ContentStamp | null> {
    const page = matchRouteFile(await this.routeList(workTree, appDir), pathname);
    const pageFile = page ? path.join(workTree, page) : await this.notFoundFile(workTree, appDir);
    if (!pageFile) return null;
    return this.graph.run({ kind: 'stamp', workTree, roots: await this.roots(workTree, appDir, pageFile) });
  }

  private async notFoundFile(workTree: string, appDir: string): Promise<string | null> {
    const routerDir = appRouterDir(path.join(workTree, appDir));
    if (!routerDir) return null;
    return (await filesIn(routerDir, /^not-found\.(tsx|ts|jsx|js)$/))[0] ?? null;
  }

  private async roots(workTree: string, appDir: string, pageFile: string): Promise<string[]> {
    const appRoot = path.join(workTree, appDir);
    const routerDir = appRouterDir(appRoot) ?? appRoot;
    const dirs: string[] = [];
    for (let dir = path.dirname(pageFile); dir.startsWith(routerDir); dir = path.dirname(dir)) {
      dirs.push(dir);
      if (dir === routerDir) break;
    }
    const segment = await Promise.all(dirs.map((dir) => filesIn(dir, SEGMENT_FILES)));
    const globals = await Promise.all([appRoot, path.join(appRoot, 'src')].map((dir) => filesIn(dir, GLOBAL_FILES)));
    return [pageFile, ...segment.flat(), ...globals.flat()];
  }
}
