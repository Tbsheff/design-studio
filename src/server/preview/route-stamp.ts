import { createHash } from 'node:crypto';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import type * as TS from 'typescript';
import type { AppRoute } from '../../shared/contracts.js';
import { matchRouteFile } from '../agent/run-target.js';
import { appRouterDir, listAppRoutes } from '../app/routes.js';
import { compilerOptionsFor, nodeModulesFile } from '../components/props-program.js';

type Ts = typeof TS;

export interface ContentStamp {
  key: string;
  newest: number;
}

interface FileDeps {
  mtimeMs: number;
  size: number;
  deps: string[];
}

const SEGMENT_FILES = /^(layout|template|loading|error|not-found)\.(tsx|ts|jsx|js)$/;
const GLOBAL_FILES = /^(next\.config|tailwind\.config|postcss\.config|middleware|proxy|instrumentation)\.(ts|js|mjs|cjs)$|^\.env(\..+)?$|^package\.json$|^tsconfig\.json$/;
const STYLE_FILE = /\.(css|scss|sass|less)$/;
const CODE_FILE = /\.(tsx?|jsx?|mjs|cjs)$/;
const GRAPH_CAP = 40000;
const ROUTES_MS = 3000;
const FIRST_WAIT_MS = 400;

let tsModule: Promise<Ts> | null = null;

function loadTs(): Promise<Ts> {
  tsModule ??= import('typescript').then((loaded) => ((loaded as { default?: Ts }).default ?? loaded) as Ts);
  return tsModule;
}

async function filesIn(dir: string, pattern: RegExp): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  return entries.filter((entry) => entry.isFile() && pattern.test(entry.name)).map((entry) => path.join(dir, entry.name));
}

function cacheFor(ts: Ts, workTree: string, options: TS.CompilerOptions, caches: Map<string, TS.ModuleResolutionCache>): TS.ModuleResolutionCache {
  const key = `${JSON.stringify(options.paths ?? {})}|${options.baseUrl ?? ''}`;
  let cache = caches.get(key);
  if (!cache) {
    cache = ts.createModuleResolutionCache(workTree, (name) => name, options);
    caches.set(key, cache);
  }
  return cache;
}

export class RouteStamps {
  private readonly files = new Map<string, FileDeps>();
  private readonly routes = new Map<string, { at: number; list: Promise<AppRoute[]> }>();

  private routeList(workTree: string, appDir: string): Promise<AppRoute[]> {
    const key = `${workTree}|${appDir}`;
    const known = this.routes.get(key);
    if (known && Date.now() - known.at < ROUTES_MS) return known.list;
    const list = listAppRoutes(workTree, appDir).catch(() => []);
    this.routes.set(key, { at: Date.now(), list });
    return list;
  }

  private readonly built = new Set<string>();
  private readonly building = new Map<string, Promise<ContentStamp | null>>();

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

  private async compute(workTree: string, appDir: string, pathname: string): Promise<ContentStamp | null> {
    const page = matchRouteFile(await this.routeList(workTree, appDir), pathname);
    const pageFile = page ? path.join(workTree, page) : await this.notFoundFile(workTree, appDir);
    if (!pageFile) return null;
    const roots = await this.roots(workTree, appDir, pageFile);
    const ts = await loadTs();
    const caches = new Map<string, TS.ModuleResolutionCache>();
    const seen = new Map<string, FileDeps>();
    let frontier = roots;
    while (frontier.length) {
      if (seen.size > GRAPH_CAP) return null;
      const next: string[] = [];
      const read = await Promise.all(frontier.filter((file) => !seen.has(file)).map(async (file) => [file, await this.depsOf(ts, workTree, file, caches)] as const));
      for (const [file, deps] of read) {
        if (!deps || seen.has(file)) continue;
        seen.set(file, deps);
        for (const dep of deps.deps) if (!seen.has(dep)) next.push(dep);
      }
      frontier = [...new Set(next)];
    }
    const parts = [...seen.entries()].map(([file, deps]) => `${file}:${deps.size}:${deps.mtimeMs}`).sort();
    const newest = Math.max(0, ...[...seen.values()].map((deps) => deps.mtimeMs));
    return { key: `r${parts.length}:${createHash('sha1').update(parts.join('|')).digest('hex').slice(0, 16)}`, newest };
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

  private async depsOf(ts: Ts, workTree: string, file: string, caches: Map<string, TS.ModuleResolutionCache>): Promise<FileDeps | null> {
    const info = await stat(file).catch(() => null);
    if (!info?.isFile()) return null;
    const known = this.files.get(file);
    if (known && known.mtimeMs === info.mtimeMs && known.size === info.size) return known;
    const deps = CODE_FILE.test(file) ? await this.imports(ts, workTree, file, caches) : [];
    const entry = { mtimeMs: info.mtimeMs, size: info.size, deps };
    if (this.files.size > GRAPH_CAP * 4) this.files.clear();
    this.files.set(file, entry);
    return entry;
  }

  private async imports(ts: Ts, workTree: string, file: string, caches: Map<string, TS.ModuleResolutionCache>): Promise<string[]> {
    const text = await readFile(file, 'utf8').catch(() => '');
    const specs = ts.preProcessFile(text, true, true).importedFiles.map((ref) => ref.fileName);
    const options = compilerOptionsFor(ts, file, workTree);
    const cache = cacheFor(ts, workTree, options, caches);
    const out: string[] = [];
    for (const spec of specs) {
      if (STYLE_FILE.test(spec)) {
        if (spec.startsWith('.')) out.push(path.resolve(path.dirname(file), spec));
        continue;
      }
      const resolved = ts.resolveModuleName(spec, file, options, ts.sys, cache).resolvedModule?.resolvedFileName;
      if (resolved && !nodeModulesFile(resolved) && !resolved.endsWith('.d.ts')) out.push(path.resolve(resolved));
    }
    return out;
  }
}
