import type { Plugin, ViteDevServer } from 'vite';
import { existsSync, realpathSync } from 'node:fs';
import { realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { BRIDGE_CHANGES_PATH, BRIDGE_SCRIPT_PATH } from '../../shared/contracts.js';
import { tagJsxSource } from './source-tags.js';

const CONFIG_FILES = ['vite.config.ts', 'vite.config.mts', 'vite.config.js', 'vite.config.mjs', 'vite.config.cts', 'vite.config.cjs'];

export interface BuildErrorPayload {
  message: string;
  file?: string;
  line?: number;
  frame?: string;
}

export function realOrSelf(target: string): string {
  try {
    return realpathSync(target);
  } catch {
    return target;
  }
}

export function findConfigFile(root: string): string | false {
  for (const name of CONFIG_FILES) {
    const candidate = path.join(root, name);
    if (existsSync(candidate)) return candidate;
  }
  return false;
}

export function relativeInside(roots: string[], file: string): string | null {
  for (const root of roots) {
    const relative = path.relative(root, file);
    if (relative && !relative.startsWith('..') && !path.isAbsolute(relative)) return relative.split(path.sep).join('/');
  }
  return null;
}

function toBuildError(raw: unknown): BuildErrorPayload | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const err = raw as { message?: unknown; id?: unknown; loc?: unknown; frame?: unknown };
  const message = typeof err.message === 'string' ? err.message : String(raw);
  const loc = (typeof err.loc === 'object' && err.loc !== null ? err.loc : {}) as { file?: unknown; line?: unknown };
  const file = typeof loc.file === 'string' ? loc.file : typeof err.id === 'string' ? err.id : undefined;
  const line = typeof loc.line === 'number' ? loc.line : undefined;
  const frame = typeof err.frame === 'string' ? err.frame : undefined;
  return { message, file, line, frame };
}

export function sourceTagsPlugin(rootCandidates: string[]): Plugin {
  return {
    name: 'studio-source-tags',
    enforce: 'pre',
    transform: {
      order: 'pre',
      handler(code, id) {
        const file = id.split('?')[0] ?? id;
        if (!/\.(jsx|tsx)$/i.test(file)) return null;
        if (file.includes('/node_modules/') || file.startsWith('\0')) return null;
        const relative = relativeInside(rootCandidates, file);
        if (!relative) return null;
        return tagJsxSource(code, file, relative);
      },
    },
  };
}

interface PageClock {
  servedAt: number;
  changedAt: number;
}

function reloadClientsThatMissedChanges(server: ViteDevServer, page: PageClock): void {
  const markChanged = (): void => {
    page.changedAt = Date.now();
  };
  server.watcher.on('change', markChanged);
  server.watcher.on('add', markChanged);
  server.watcher.on('unlink', markChanged);
  server.ws.on('connection', (socket: { send: (data: string) => void }) => {
    if (page.servedAt > 0 && page.changedAt >= page.servedAt) socket.send(JSON.stringify({ type: 'full-reload', path: '*' }));
  });
}

async function fileStamp(file: string): Promise<string> {
  try {
    const info = await stat(file);
    return `${info.size}:${info.mtimeMs}`;
  } catch {
    return 'missing';
  }
}

export class ChangeSync {
  private server: ViteDevServer | null = null;
  private readonly stamps = new Map<string, string>();

  attach(server: ViteDevServer): void {
    this.server = server;
    server.watcher.on('change', (file: string) => {
      void fileStamp(file).then((stamp) => this.stamps.set(file, stamp));
    });
  }

  async notify(files: string[]): Promise<void> {
    const server = this.server;
    if (!server) return;
    for (const listed of files) {
      const file = await realpath(listed).catch(() => listed);
      const stamp = await fileStamp(file);
      if (stamp === 'missing' || this.stamps.get(file) === stamp) continue;
      this.stamps.set(file, stamp);
      server.watcher.emit('change', file);
    }
  }
}

export function bridgePlugin(
  bridgeScript: () => Promise<string>,
  onBuildError: (error: BuildErrorPayload) => Promise<void>,
  sync: ChangeSync,
): Plugin {
  const page: PageClock = { servedAt: 0, changedAt: 0 };
  return {
    name: 'studio-bridge',
    transformIndexHtml: {
      order: 'pre',
      handler() {
        page.servedAt = Date.now();
        return [{ tag: 'script', attrs: { src: BRIDGE_SCRIPT_PATH }, injectTo: 'head-prepend' }];
      },
    },
    configureServer(server) {
      reloadClientsThatMissedChanges(server, page);
      sync.attach(server);
      const hot = server.environments.client.hot;
      const originalSend = hot.send.bind(hot) as (...args: unknown[]) => void;
      const patchedSend = (...args: unknown[]): void => {
        const payload = args[0];
        const isError = typeof payload === 'object' && payload !== null && (payload as { type?: unknown }).type === 'error';
        const error = isError ? toBuildError((payload as { err?: unknown }).err) : null;
        if (!error) {
          originalSend(...args);
          return;
        }
        void onBuildError(error).finally(() => originalSend(...args));
      };
      (hot as unknown as { send: (...args: unknown[]) => void }).send = patchedSend;
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0];
        if (url === BRIDGE_CHANGES_PATH) {
          res.statusCode = 200;
          res.setHeader('content-type', 'application/json');
          res.setHeader('cache-control', 'no-store');
          res.end(JSON.stringify({ changedAt: page.changedAt }));
          return;
        }
        if (url !== BRIDGE_SCRIPT_PATH) {
          next();
          return;
        }
        bridgeScript().then(
          (script) => {
            res.statusCode = 200;
            res.setHeader('content-type', 'text/javascript; charset=utf-8');
            res.setHeader('cache-control', 'no-store');
            res.end(script);
          },
          (error: unknown) => next(error),
        );
      });
    },
  };
}
