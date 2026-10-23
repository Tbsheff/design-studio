import { createServer, searchForWorkspaceRoot } from 'vite';
import type { InlineConfig, Plugin, ViteDevServer } from 'vite';
import react from '@vitejs/plugin-react';
import { existsSync } from 'node:fs';
import path from 'node:path';
import {
  bridgePlugin,
  ChangeSync,
  findConfigFile,
  realOrSelf,
  relativeInside,
  sourceTagsPlugin,
  type BuildErrorPayload,
} from './vite-plugins.js';

export interface RunnerInit {
  type: 'init';
  root: string;
  port: number;
  cacheDir: string;
  bridgeScript: string;
}

export type RunnerToParent =
  | { type: 'ready' }
  | { type: 'failed'; code: string | null; message: string }
  | { type: 'build-error'; message: string; file?: string; line?: number; frame?: string };

export type ParentToRunner = RunnerInit | { type: 'notify'; files: string[] } | { type: 'close' };

function send(message: RunnerToParent): Promise<void> {
  return new Promise((resolve) => {
    if (!process.send) {
      resolve();
      return;
    }
    process.send(message, undefined, {}, () => resolve());
  });
}

const BUILD_ERROR_LEAD_MS = 30;

function buildConfig(init: RunnerInit, sync: ChangeSync): InlineConfig {
  const root = path.resolve(init.root);
  const realRoot = realOrSelf(root);
  const configFile = findConfigFile(root);
  const rootCandidates = [...new Set([realRoot, root])];
  const onBuildError = async (error: BuildErrorPayload): Promise<void> => {
    const file = error.file ? (relativeInside(rootCandidates, error.file) ?? error.file) : undefined;
    await send({ type: 'build-error', message: error.message, file, line: error.line, frame: error.frame });
    await new Promise((resolve) => setTimeout(resolve, BUILD_ERROR_LEAD_MS));
  };
  const allow = new Set<string>([searchForWorkspaceRoot(root), root, realRoot, path.resolve(init.cacheDir)]);
  const nodeModules = path.join(root, 'node_modules');
  if (existsSync(nodeModules)) allow.add(realOrSelf(nodeModules));
  const studioPlugins: Plugin[] = [sourceTagsPlugin(rootCandidates), bridgePlugin(() => Promise.resolve(init.bridgeScript), onBuildError, sync)];
  return {
    root,
    configFile,
    cacheDir: init.cacheDir,
    clearScreen: false,
    logLevel: 'warn',
    plugins: configFile ? studioPlugins : [...studioPlugins, react()],
    server: {
      host: '127.0.0.1',
      port: init.port,
      strictPort: true,
      hmr: true,
      fs: { strict: true, allow: [...allow] },
    },
  };
}

async function start(init: RunnerInit, sync: ChangeSync): Promise<ViteDevServer> {
  const server = await createServer(buildConfig(init, sync));
  try {
    await server.listen(init.port);
  } catch (error) {
    await server.close().catch(() => undefined);
    throw error;
  }
  return server;
}

function failAndExit(error: unknown): void {
  const code = typeof (error as { code?: unknown }).code === 'string' ? ((error as { code: string }).code) : null;
  const message = error instanceof Error ? error.message : String(error);
  void send({ type: 'failed', code, message }).finally(() => process.exit(1));
}

function main(): void {
  const sync = new ChangeSync();
  let server: ViteDevServer | null = null;
  process.on('disconnect', () => process.exit(0));
  process.on('message', (raw: ParentToRunner) => {
    if (raw.type === 'init' && server === null) {
      start(raw, sync).then(
        (started) => {
          server = started;
          void send({ type: 'ready' });
        },
        failAndExit,
      );
      return;
    }
    if (raw.type === 'notify') {
      void sync.notify(raw.files).catch(() => undefined);
      return;
    }
    if (raw.type === 'close') {
      const closing = server ? server.close() : Promise.resolve();
      void closing.finally(() => process.exit(0));
    }
  });
}

main();
