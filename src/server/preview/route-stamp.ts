import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Worker } from 'node:worker_threads';
import type { AppRoute } from '../../shared/contracts.js';
import { matchRouteFile } from '../agent/run-target.js';
import { appRouterDir, listAppRoutes } from '../app/routes.js';
import { REPO_ROOT } from '../config.js';
import { RouteGraph, type ContentStamp } from './route-graph.js';
import type { GraphReply, GraphRequest } from './route-graph-worker.js';

export type { ContentStamp } from './route-graph.js';

const SEGMENT_FILES = /^(layout|template|loading|error|not-found)\.(tsx|ts|jsx|js)$/;
const GLOBAL_FILES = /^(next\.config|tailwind\.config|postcss\.config|middleware|proxy|instrumentation)\.(ts|js|mjs|cjs)$|^\.env(\..+)?$|^package\.json$|^tsconfig\.json$/;
const ROUTES_MS = 3000;
const FIRST_WAIT_MS = 400;
const MAX_WORKER_FAILURES = 3;
const OWN_URL = fileURLToPath(import.meta.url);
const WORKER_FILE = path.join(path.dirname(OWN_URL), `route-graph-worker${path.extname(OWN_URL)}`);
const TSX_LOADER = path.join(REPO_ROOT, 'node_modules', 'tsx', 'dist', 'loader.mjs');

async function filesIn(dir: string, pattern: RegExp): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  return entries.filter((entry) => entry.isFile() && pattern.test(entry.name)).map((entry) => path.join(dir, entry.name));
}

interface Pending {
  resolve: (stamp: ContentStamp | null) => void;
  reject: (error: Error) => void;
}

class GraphWorker {
  private worker: Worker | null = null;
  private inProcess: RouteGraph | null = null;
  private readonly pending = new Map<number, Pending>();
  private nextId = 1;
  private failures = 0;

  constructor(private readonly cacheDir: string | null) {}

  stamp(workTree: string, roots: string[]): Promise<ContentStamp | null> {
    if (this.inProcess) return this.inProcess.stamp(workTree, roots);
    const worker = this.spawn();
    if (!worker) return this.stamp(workTree, roots);
    const id = this.nextId++;
    return new Promise<ContentStamp | null>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      worker.ref();
      worker.postMessage({ id, workTree, roots } satisfies GraphRequest);
    });
  }

  async close(): Promise<void> {
    const worker = this.worker;
    this.worker = null;
    if (!worker) return this.inProcess?.flush();
    await new Promise<void>((resolve) => {
      const done = (): void => resolve();
      worker.once('message', done);
      worker.once('exit', done);
      worker.ref();
      worker.postMessage('flush');
    });
    await worker.terminate();
  }

  private spawn(): Worker | null {
    if (this.worker) return this.worker;
    try {
      const execArgv = WORKER_FILE.endsWith('.ts') ? ['--import', pathToFileURL(TSX_LOADER).href] : [];
      const worker = new Worker(WORKER_FILE, { workerData: { cacheDir: this.cacheDir }, execArgv });
      worker.unref();
      worker.on('message', (reply: GraphReply) => this.settle(reply));
      worker.on('error', (error) => this.fail(worker, error));
      worker.on('exit', (code) => this.fail(worker, new Error(`route graph worker exited with code ${code}`)));
      this.worker = worker;
      return worker;
    } catch (error) {
      console.error('[preview] route graph worker did not start; walking in process', error);
      this.inProcess = new RouteGraph(this.cacheDir);
      return null;
    }
  }

  private settle(reply: GraphReply): void {
    if (!('id' in reply)) return;
    const waiting = this.pending.get(reply.id);
    if (!waiting) return;
    this.pending.delete(reply.id);
    if (this.pending.size === 0) this.worker?.unref();
    if ('error' in reply) waiting.reject(new Error(reply.error));
    else waiting.resolve(reply.stamp);
  }

  private fail(worker: Worker, error: Error): void {
    if (this.worker !== worker) return;
    this.worker = null;
    this.failures += 1;
    if (this.failures >= MAX_WORKER_FAILURES) this.inProcess = new RouteGraph(this.cacheDir);
    const waiting = [...this.pending.values()];
    this.pending.clear();
    for (const item of waiting) item.reject(error);
  }
}

export class RouteStamps {
  private readonly routes = new Map<string, { at: number; list: Promise<AppRoute[]> }>();
  private readonly built = new Set<string>();
  private readonly building = new Map<string, Promise<ContentStamp | null>>();
  private readonly graph: GraphWorker;

  constructor(cacheDir: string | null = null) {
    this.graph = new GraphWorker(cacheDir);
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

  close(): Promise<void> {
    return this.graph.close();
  }

  private async compute(workTree: string, appDir: string, pathname: string): Promise<ContentStamp | null> {
    const page = matchRouteFile(await this.routeList(workTree, appDir), pathname);
    const pageFile = page ? path.join(workTree, page) : await this.notFoundFile(workTree, appDir);
    if (!pageFile) return null;
    return this.graph.stamp(workTree, await this.roots(workTree, appDir, pageFile));
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
