import { existsSync } from 'node:fs';
import { lstat, symlink } from 'node:fs/promises';
import path from 'node:path';
import { TOKENS_FILE, projectPreviewOrigin } from '../../shared/contracts.js';
import type { Direction, Project, RenderCheckResult } from '../../shared/contracts.js';
import { designSystemLinkProblem } from '../design-system/html-link.js';
import { buildErrorMessage, syncDesignSystem } from '../design-system/sync.js';
import type { EventBus, PreviewService, ProjectStore, ServerConfig, VersionStore } from '../types.js';
import { loadBridgeScript } from './bridge-bundle.js';
import type { BrowserPool, RenderCheckOptions } from './browser.js';
import { startHtmlServer } from './html-server.js';
import type { HtmlServer, RootKind } from './html-server.js';
import type { ViteManager, ViteTarget } from './vite-manager.js';
import { WatcherManager } from './watcher.js';

interface PreviewServiceDeps {
  config: ServerConfig;
  bus: EventBus;
  projects: ProjectStore;
  versions: VersionStore;
}

function encodeEntry(entry: string): string {
  return entry
    .split('/')
    .filter((segment) => segment !== '')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

async function linkNodeModules(project: Project, snapshotDir: string): Promise<void> {
  const target = path.join(snapshotDir, 'node_modules');
  const present = await lstat(target).then(
    () => true,
    () => false,
  );
  if (present) return;
  const source = project.directions
    .map((direction) => path.join(direction.workTree, 'node_modules'))
    .find((candidate) => existsSync(candidate));
  if (!source) return;
  await symlink(source, target, 'dir').catch((error: unknown) => {
    if ((error as { code?: unknown }).code !== 'EEXIST') throw error;
  });
}

function lazily<T>(load: () => Promise<T>): { get: () => Promise<T>; loaded: () => Promise<T> | null } {
  let pending: Promise<T> | null = null;
  return {
    get: () => {
      if (!pending) {
        pending = load().catch((error: unknown) => {
          pending = null;
          throw error;
        });
      }
      return pending;
    },
    loaded: () => pending,
  };
}

interface DirectionChange {
  projectId: string;
  directionId: string;
  root: string;
  paths: string[];
}

export async function recompileOnTokensChange(bus: EventBus, change: DirectionChange): Promise<void> {
  if (!change.paths.includes(TOKENS_FILE)) return;
  const result = await syncDesignSystem(change.root);
  if (result.errors.length === 0) return;
  bus.emit({
    type: 'preview.build-error',
    projectId: change.projectId,
    directionId: change.directionId,
    message: buildErrorMessage(result.errors),
    file: TOKENS_FILE,
  });
}

export function withDesignSystemWarning(results: RenderCheckResult[], problem: string | null): RenderCheckResult[] {
  if (problem === null) return results;
  return results.map((result) => ({ ...result, ok: false, consoleErrors: [...result.consoleErrors, problem] }));
}

export function createPreviewService(deps: PreviewServiceDeps): PreviewService {
  const { config, bus, projects, versions } = deps;
  const snapshotRoots = new Map<string, string>();
  const forwardToVite = (change: DirectionChange): void => {
    void recompileOnTokensChange(bus, change).catch((error: unknown) => console.error('[preview] tokens recompile failed', error));
    const files = change.paths.map((relative) => path.join(change.root, ...relative.split('/')));
    void vite
      .loaded()
      ?.then((manager) => manager.notifyChanged(`d:${change.projectId}:${change.directionId}`, files))
      .catch(() => undefined);
  };
  const watchers = new WatcherManager({ bus, projects, versions, onChanged: forwardToVite });
  const vite = lazily<ViteManager>(async () => {
    const { ViteManager: Manager } = await import('./vite-manager.js');
    return new Manager({ bus, vitePortBase: config.vitePortBase, bridgeScript: loadBridgeScript });
  });
  const browsers = lazily<BrowserPool>(async () => {
    const { BrowserPool: Pool } = await import('./browser.js');
    return new Pool(config.previewOrigin);
  });
  const viteUrl = async (target: ViteTarget): Promise<string> => (await vite.get()).url(target);
  let htmlServer: HtmlServer | null = null;
  let starting: Promise<void> | null = null;

  const resolveRoot = async (kind: RootKind, projectId: string, key: string): Promise<string | null> => {
    if (kind === 'direction') {
      const project = await projects.get(projectId);
      return project.directions.find((direction) => direction.id === key)?.workTree ?? null;
    }
    const registered = snapshotRoots.get(`${projectId}/${key}`);
    if (registered) return registered;
    const project = await projects.get(projectId);
    const dir = await versions.snapshot(project, key);
    snapshotRoots.set(`${projectId}/${key}`, dir);
    return dir;
  };

  const start = (): Promise<void> => {
    if (!starting) {
      starting = (async () => {
        htmlServer = await startHtmlServer({
          port: config.previewPort,
          studioOrigin: config.studioOrigin,
          bridgeScript: loadBridgeScript,
          resolveRoot,
        });
      })().catch((error: unknown) => {
        starting = null;
        throw error;
      });
    }
    return starting;
  };

  const directionUrl = async (project: Project, direction: Direction): Promise<string> => {
    watchers.watch(project, direction);
    if (project.kind === 'html') {
      return `${projectPreviewOrigin(project.id, config.previewPort)}/d/${encodeURIComponent(project.id)}/${encodeURIComponent(direction.id)}/${encodeEntry(project.entry || 'index.html')}`;
    }
    return viteUrl({
      key: `d:${project.id}:${direction.id}`,
      root: direction.workTree,
      cacheDir: path.join(projects.projectDir(project.id), 'vite-cache', direction.id),
      projectId: project.id,
      directionId: direction.id,
    });
  };

  const snapshotUrl = async (project: Project, versionId: string, snapshotDir: string): Promise<string> => {
    snapshotRoots.set(`${project.id}/${versionId}`, snapshotDir);
    if (project.kind === 'html') {
      return `${projectPreviewOrigin(project.id, config.previewPort)}/s/${encodeURIComponent(project.id)}/${encodeURIComponent(versionId)}/${encodeEntry(project.entry || 'index.html')}`;
    }
    await linkNodeModules(project, snapshotDir);
    return viteUrl({
      key: `s:${project.id}:${versionId}`,
      root: snapshotDir,
      cacheDir: path.join(projects.projectDir(project.id), 'vite-cache', `snapshot-${versionId}`),
      projectId: project.id,
    });
  };

  const renderCheck = async (project: Project, direction: Direction, options?: RenderCheckOptions): Promise<RenderCheckResult[]> => {
    const url = await directionUrl(project, direction);
    const results = await (await browsers.get()).renderCheck(url, path.join(projects.projectDir(project.id), 'checks'), direction.id, options);
    const problem = project.kind === 'html' ? await designSystemLinkProblem(direction.workTree, project.entry || 'index.html') : null;
    return withDesignSystemWarning(results, problem);
  };

  const stop = async (): Promise<void> => {
    const server = htmlServer;
    htmlServer = null;
    starting = null;
    await Promise.all([
      vite.loaded()?.then((manager) => manager.stopAll()).catch(() => undefined),
      watchers.closeAll().catch(() => undefined),
      browsers.loaded()?.then((pool) => pool.close()).catch(() => undefined),
      server?.close().catch(() => undefined),
    ]);
  };

  return {
    start,
    stop,
    directionUrl,
    snapshotUrl,
    watch: (project, direction) => watchers.watch(project, direction),
    unwatch: (directionId) => watchers.unwatch(directionId),
    release: async (project, direction) => {
      watchers.unwatchOf(project.id, direction.id);
      await vite.loaded()?.then((manager) => manager.stopOne(`d:${project.id}:${direction.id}`));
    },
    renderCheck,
    inspect: async (url, viewport, outPath, selectionLocs) => (await browsers.get()).inspect(url, viewport, outPath, selectionLocs),
    screenshot: async (url, viewport, outPath) => (await browsers.get()).screenshot(url, viewport, outPath),
    screenshotTiles: async (url, request) => (await browsers.get()).screenshotTiles(url, request),
    elementShots: async (url, viewport, selectors, outPrefix) => (await browsers.get()).elementShots(url, viewport, selectors, outPrefix),
  };
}
