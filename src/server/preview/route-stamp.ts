import { readdir } from 'node:fs/promises';
import path from 'node:path';
import type { AppRoute } from '../../shared/contracts.js';
import { matchRouteFile } from '../agent/run-target.js';
import { appRouterDir, listAppRoutes } from '../app/routes.js';
import { siblingWorkerFile, WorkerClient } from '../worker-client.js';
import { answerGraph, RouteGraph, type ContentStamp, type GraphReply, type GraphRequest, type ImportEdges } from './route-graph.js';

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

const ROUTE_GRAPH_IDLE_MS = 2 * 60_000;
const USAGE_GRAPH_IDLE_MS = 20_000;

function graphClient(label: string, cacheDir: string | null, idleMs: number): WorkerClient<GraphRequest, GraphReply> {
  let inProcess: RouteGraph | null = null;
  const answer = (request: GraphRequest) => answerGraph((inProcess ??= new RouteGraph(cacheDir)), request);
  return new WorkerClient({ file: WORKER_FILE, label, workerData: { cacheDir }, inProcess: answer, idleMs });
}

export class RouteStamps {
  private readonly routes = new Map<string, { at: number; list: Promise<AppRoute[]> }>();
  private readonly built = new Set<string>();
  private readonly building = new Map<string, Promise<ContentStamp | null>>();
  private readonly graph: WorkerClient<GraphRequest, GraphReply>;
  private readonly usageGraph: WorkerClient<GraphRequest, GraphReply>;

  constructor(cacheDir: string | null = null) {
    this.graph = graphClient('route graph', cacheDir, ROUTE_GRAPH_IDLE_MS);
    this.usageGraph = graphClient('usage graph', cacheDir ? `${cacheDir}-usage` : null, USAGE_GRAPH_IDLE_MS);
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

  async edges(workTree: string, roots: string[]): Promise<ImportEdges> {
    return ((await this.usageGraph.run({ kind: 'edges', workTree, roots })) as ImportEdges | null) ?? [];
  }

  async close(): Promise<void> {
    await Promise.all(
      [this.graph, this.usageGraph].map(async (client) => {
        if (client.started) await client.run({ kind: 'flush' }).catch(() => null);
        await client.close();
      }),
    );
  }

  private async compute(workTree: string, appDir: string, pathname: string): Promise<ContentStamp | null> {
    const page = matchRouteFile(await this.routeList(workTree, appDir), pathname);
    const pageFile = page ? path.join(workTree, page) : await this.notFoundFile(workTree, appDir);
    if (!pageFile) return null;
    return (await this.graph.run({ kind: 'stamp', workTree, roots: await this.roots(workTree, appDir, pageFile) })) as ContentStamp | null;
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
