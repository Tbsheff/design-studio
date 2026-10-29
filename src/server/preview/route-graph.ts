import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import type * as TS from 'typescript';
import { compilerConfigFor, nodeModulesFile } from '../components/props-program.js';

type Ts = typeof TS;

export interface ContentStamp {
  key: string;
  newest: number;
}

export type ImportEdges = [file: string, deps: string[]][];
export type GraphRequest = { kind: 'stamp'; workTree: string; roots: string[] } | { kind: 'edges'; workTree: string; roots: string[] } | { kind: 'flush' };
export type GraphReply = ContentStamp | ImportEdges | null;

interface FileDeps {
  mtimeMs: number;
  size: number;
  deps: string[];
}

interface WalkScope {
  workTree: string;
  graph: WorkTreeGraph;
  options: Map<string, TS.CompilerOptions>;
  caches: Map<string, TS.ModuleResolutionCache>;
}

type SavedEntry = [file: string, mtimeMs: number, size: number, deps: string[]];

interface SavedGraph {
  version: number;
  ts: string;
  config: string;
  configs: string[];
  files: SavedEntry[];
}

const STYLE_FILE = /\.(css|scss|sass|less)$/;
const CODE_FILE = /\.(tsx?|jsx?|mjs|cjs)$/;
const GRAPH_CAP = 40000;
const SAVED_VERSION = 2;
const SAVE_DELAY_MS = 2000;
const CONFIG_FILES = ['package.json', 'tsconfig.json', 'tsconfig.base.json', 'tsconfig.app.json', 'pnpm-lock.yaml', 'package-lock.json', 'yarn.lock', 'bun.lock', 'pnpm-workspace.yaml'];

let tsModule: Promise<Ts> | null = null;
let tsVersion: string | null = null;

function typescriptVersion(): string {
  tsVersion ??= (createRequire(import.meta.url)('typescript/package.json') as { version: string }).version;
  return tsVersion;
}

function loadTs(): Promise<Ts> {
  tsModule ??= import('typescript').then((loaded) => ((loaded as { default?: Ts }).default ?? loaded) as Ts);
  return tsModule;
}

function resolutionCache(ts: Ts, scope: WalkScope, options: TS.CompilerOptions): TS.ModuleResolutionCache {
  const key = `${JSON.stringify(options.paths ?? {})}|${options.baseUrl ?? ''}`;
  let cache = scope.caches.get(key);
  if (!cache) {
    cache = ts.createModuleResolutionCache(scope.workTree, (name) => name, options);
    scope.caches.set(key, cache);
  }
  return cache;
}

function optionsFor(ts: Ts, scope: WalkScope, file: string): TS.CompilerOptions {
  const dir = path.dirname(file);
  let options = scope.options.get(dir);
  if (!options) {
    const picked = compilerConfigFor(ts, file, scope.workTree);
    options = picked.options;
    if (picked.configFile) scope.graph.usedConfig(picked.configFile);
    scope.options.set(dir, options);
  }
  return options;
}

async function configStamp(workTree: string, configs: Iterable<string>): Promise<string> {
  const names = [...new Set([...CONFIG_FILES, ...configs])].sort();
  const parts = await Promise.all(names.map(async (name) => `${name}:${(await stat(path.join(workTree, name)).catch(() => null))?.mtimeMs ?? -1}`));
  return parts.join('|');
}

function stampOf(seen: Map<string, FileDeps>): ContentStamp {
  const parts = [...seen.entries()].map(([file, deps]) => `${file}:${deps.size}:${deps.mtimeMs}`).sort();
  let newest = 0;
  for (const deps of seen.values()) newest = Math.max(newest, deps.mtimeMs);
  return { key: `r${parts.length}:${createHash('sha1').update(parts.join('|')).digest('hex').slice(0, 16)}`, newest };
}

class WorkTreeGraph {
  readonly files = new Map<string, FileDeps>();
  private readonly configs = new Set<string>();
  private loaded: Promise<void> | null = null;
  private saveTimer: NodeJS.Timeout | null = null;
  private dirty = false;

  constructor(
    readonly workTree: string,
    private readonly cacheFile: string | null,
  ) {}

  ready(): Promise<void> {
    this.loaded ??= this.load().catch(() => undefined);
    return this.loaded;
  }

  private async load(): Promise<void> {
    if (!this.cacheFile) return;
    const saved = JSON.parse(await readFile(this.cacheFile, 'utf8')) as SavedGraph;
    if (saved.version !== SAVED_VERSION || saved.ts !== typescriptVersion() || saved.config !== (await configStamp(this.workTree, saved.configs))) return;
    for (const config of saved.configs) this.configs.add(config);
    const absolute = (file: string): string => path.resolve(this.workTree, file);
    for (const [file, mtimeMs, size, deps] of saved.files) if (!this.files.has(absolute(file))) this.files.set(absolute(file), { mtimeMs, size, deps: deps.map(absolute) });
  }

  usedConfig(file: string): void {
    const relative = path.relative(this.workTree, file);
    if (this.configs.has(relative)) return;
    this.configs.add(relative);
    this.dirty = true;
  }

  remember(file: string, entry: FileDeps): void {
    if (this.files.size > GRAPH_CAP * 4) this.files.clear();
    this.files.set(file, entry);
    this.dirty = true;
  }

  scheduleSave(): void {
    if (!this.cacheFile || !this.dirty || this.saveTimer) return;
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      void this.save().catch(() => undefined);
    }, SAVE_DELAY_MS);
    this.saveTimer.unref();
  }

  async save(): Promise<void> {
    if (!this.cacheFile || !this.dirty) return;
    this.dirty = false;
    const relative = (file: string): string => path.relative(this.workTree, file);
    const files: SavedEntry[] = [...this.files.entries()].map(([file, deps]) => [relative(file), deps.mtimeMs, deps.size, deps.deps.map(relative)]);
    const saved: SavedGraph = { version: SAVED_VERSION, ts: typescriptVersion(), config: await configStamp(this.workTree, this.configs), configs: [...this.configs], files };
    await mkdir(path.dirname(this.cacheFile), { recursive: true });
    const temp = `${this.cacheFile}.${process.pid}.tmp`;
    await writeFile(temp, JSON.stringify(saved));
    await rename(temp, this.cacheFile);
  }

  flushNow(): Promise<void> {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = null;
    return this.save();
  }
}

export class RouteGraph {
  private readonly graphs = new Map<string, WorkTreeGraph>();

  constructor(private readonly cacheDir: string | null = null) {}

  private graphFor(workTree: string): WorkTreeGraph {
    let graph = this.graphs.get(workTree);
    if (!graph) {
      const name = `${createHash('sha1').update(workTree).digest('hex').slice(0, 16)}.json`;
      graph = new WorkTreeGraph(workTree, this.cacheDir ? path.join(this.cacheDir, name) : null);
      this.graphs.set(workTree, graph);
    }
    return graph;
  }

  files(workTree: string): Map<string, FileDeps> {
    return this.graphFor(workTree).files;
  }

  async stamp(workTree: string, roots: string[]): Promise<ContentStamp | null> {
    const seen = await this.walk(workTree, roots);
    return seen ? stampOf(seen) : null;
  }

  async edges(workTree: string, roots: string[]): Promise<ImportEdges> {
    const seen = await this.walk(workTree, roots, Infinity);
    return [...(seen ?? new Map<string, FileDeps>()).entries()].map(([file, entry]) => [file, entry.deps]);
  }

  private async walk(workTree: string, roots: string[], cap = GRAPH_CAP): Promise<Map<string, FileDeps> | null> {
    const graph = this.graphFor(workTree);
    await graph.ready();
    const scope: WalkScope = { workTree, graph, options: new Map(), caches: new Map() };
    const seen = new Map<string, FileDeps>();
    let frontier = roots;
    while (frontier.length) {
      if (seen.size > cap) return null;
      const next: string[] = [];
      const read = await Promise.all(frontier.filter((file) => !seen.has(file)).map(async (file) => [file, await this.depsOf(scope, graph, file)] as const));
      for (const [file, deps] of read) {
        if (!deps || seen.has(file)) continue;
        seen.set(file, deps);
        for (const dep of deps.deps) if (!seen.has(dep)) next.push(dep);
      }
      frontier = [...new Set(next)];
    }
    graph.scheduleSave();
    return seen;
  }

  async flush(): Promise<void> {
    await Promise.all([...this.graphs.values()].map((graph) => graph.flushNow().catch(() => undefined)));
  }

  private async depsOf(scope: WalkScope, graph: WorkTreeGraph, file: string): Promise<FileDeps | null> {
    const info = await stat(file).catch(() => null);
    if (!info?.isFile()) return null;
    const known = graph.files.get(file);
    if (known && known.mtimeMs === info.mtimeMs && known.size === info.size) return known;
    const deps = CODE_FILE.test(file) ? await this.imports(scope, file) : [];
    const entry = { mtimeMs: info.mtimeMs, size: info.size, deps };
    graph.remember(file, entry);
    return entry;
  }

  private async imports(scope: WalkScope, file: string): Promise<string[]> {
    const ts = await loadTs();
    const text = await readFile(file, 'utf8').catch(() => '');
    const specs = ts.preProcessFile(text, true, true).importedFiles.map((ref) => ref.fileName);
    const options = optionsFor(ts, scope, file);
    const cache = resolutionCache(ts, scope, options);
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

export async function answerGraph(graph: RouteGraph, request: GraphRequest): Promise<GraphReply> {
  if (request.kind === 'flush') {
    await graph.flush();
    return null;
  }
  if (request.kind === 'edges') return graph.edges(request.workTree, request.roots);
  return graph.stamp(request.workTree, request.roots);
}
