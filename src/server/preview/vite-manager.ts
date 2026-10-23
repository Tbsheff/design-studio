import { fork } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { REPO_ROOT } from '../config.js';
import type { EventBus } from '../types.js';
import type { ParentToRunner, RunnerToParent } from './vite-runner.js';

const MAX_PORT_ATTEMPTS = 200;
const MAX_START_ATTEMPTS = 3;
const START_TIMEOUT_MS = 60_000;
const CLOSE_TIMEOUT_MS = 3_000;
const MAX_TEXT = 20_000;
const OWN_URL = fileURLToPath(import.meta.url);
const RUNNER_FILE = path.join(path.dirname(OWN_URL), `vite-runner${path.extname(OWN_URL)}`);
const TSX_LOADER = path.join(REPO_ROOT, 'node_modules', 'tsx', 'dist', 'loader.mjs');

export interface ViteTarget {
  key: string;
  root: string;
  cacheDir: string;
  projectId: string;
  directionId?: string;
}

interface ViteManagerDeps {
  bus: EventBus;
  vitePortBase: number;
  bridgeScript: () => Promise<string>;
}

interface RunningVite {
  child: ChildProcess;
  home: string;
  url: string;
  port: number;
}

class StartError extends Error {
  constructor(
    message: string,
    readonly code: string | null,
  ) {
    super(message);
  }
}

function portIsFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const probe = net.createServer();
    probe.unref();
    probe.once('error', () => resolve(false));
    probe.listen({ port, host: '127.0.0.1', exclusive: true }, () => {
      probe.close(() => resolve(true));
    });
  });
}

function childEnv(home: string): NodeJS.ProcessEnv {
  return {
    PATH: process.env.PATH ?? '/usr/bin:/bin',
    HOME: home,
    TMPDIR: home,
    NODE_ENV: 'development',
    ...(process.versions.electron ? { ELECTRON_RUN_AS_NODE: '1' } : {}),
  };
}

function runnerExecArgv(): string[] {
  return RUNNER_FILE.endsWith('.ts') ? ['--import', pathToFileURL(TSX_LOADER).href] : [];
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' ? value.slice(0, MAX_TEXT) : undefined;
}

function readMessage(raw: unknown): RunnerToParent | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const message = raw as Record<string, unknown>;
  if (message.type === 'ready') return { type: 'ready' };
  if (message.type === 'failed') return { type: 'failed', code: text(message.code) ?? null, message: text(message.message) ?? 'Vite failed' };
  if (message.type !== 'build-error') return null;
  const line = typeof message.line === 'number' && Number.isFinite(message.line) ? message.line : undefined;
  return { type: 'build-error', message: text(message.message) ?? 'Build error', file: text(message.file), line, frame: text(message.frame) };
}

function waitForReady(child: ChildProcess): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => finish(new StartError('Vite did not start in time', null)), START_TIMEOUT_MS);
    const finish = (error: Error | null): void => {
      clearTimeout(timer);
      child.off('message', onMessage);
      child.off('exit', onExit);
      if (error) reject(error);
      else resolve();
    };
    const onMessage = (raw: unknown): void => {
      const message = readMessage(raw);
      if (message?.type === 'ready') finish(null);
      if (message?.type === 'failed') finish(new StartError(message.message, message.code));
    };
    const onExit = (code: number | null): void => finish(new StartError(`Vite process exited with code ${String(code)}`, null));
    child.on('message', onMessage);
    child.once('exit', onExit);
  });
}

function stopChild(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return Promise.resolve();
  return new Promise((resolve) => {
    const timer = setTimeout(() => child.kill('SIGKILL'), CLOSE_TIMEOUT_MS);
    child.once('exit', () => {
      clearTimeout(timer);
      resolve();
    });
    const closeMessage: ParentToRunner = { type: 'close' };
    if (child.connected) child.send(closeMessage, (error) => error && child.kill('SIGKILL'));
    else child.kill('SIGTERM');
  });
}

function isPortInUse(error: unknown): boolean {
  const code = (error as { code?: unknown }).code;
  const message = error instanceof Error ? error.message : '';
  return code === 'EADDRINUSE' || /already in use|EADDRINUSE/i.test(message);
}

export class ViteManager {
  private readonly running = new Map<string, Promise<RunningVite>>();
  private readonly reservedPorts = new Set<number>();
  private stopped = false;

  constructor(private readonly deps: ViteManagerDeps) {}

  url(target: ViteTarget): Promise<string> {
    return this.ensure(target).then((entry) => entry.url);
  }

  pid(key: string): Promise<number | undefined> | null {
    const entry = this.running.get(key);
    return entry ? entry.then((item) => item.child.pid) : null;
  }

  ensure(target: ViteTarget): Promise<RunningVite> {
    if (this.stopped) return Promise.reject(new Error('Preview service is stopped'));
    const existing = this.running.get(target.key);
    if (existing) return existing;
    const starting = this.start(target).catch((error: unknown) => {
      this.running.delete(target.key);
      throw error;
    });
    this.running.set(target.key, starting);
    return starting;
  }

  async stopOne(key: string): Promise<void> {
    const entry = this.running.get(key);
    if (!entry) return;
    this.running.delete(key);
    const running = await entry.catch(() => null);
    if (!running) return;
    this.reservedPorts.delete(running.port);
    await stopChild(running.child);
    rmSync(running.home, { recursive: true, force: true });
  }

  async stopAll(): Promise<void> {
    this.stopped = true;
    const keys = [...this.running.keys()];
    await Promise.all(keys.map((key) => this.stopOne(key).catch(() => undefined)));
  }

  async notifyChanged(key: string, files: string[]): Promise<void> {
    const entry = this.running.get(key);
    if (!entry) return;
    const running = await entry.catch(() => null);
    if (!running?.child.connected) return;
    const message: ParentToRunner = { type: 'notify', files };
    running.child.send(message, () => undefined);
  }

  private async nextFreePort(): Promise<number> {
    for (let offset = 0; offset < MAX_PORT_ATTEMPTS; offset += 1) {
      const port = this.deps.vitePortBase + offset;
      if (this.reservedPorts.has(port)) continue;
      if (await portIsFree(port)) {
        this.reservedPorts.add(port);
        return port;
      }
    }
    throw new Error(`No free Vite port from ${this.deps.vitePortBase}`);
  }

  private emitBuildError(target: ViteTarget, message: Extract<RunnerToParent, { type: 'build-error' }>): void {
    this.deps.bus.emit({
      type: 'preview.build-error',
      projectId: target.projectId,
      directionId: target.directionId,
      message: message.message,
      file: message.file,
      line: message.line,
      frame: message.frame,
    });
  }

  private watchChild(target: ViteTarget, running: RunningVite): void {
    running.child.on('message', (raw: unknown) => {
      const message = readMessage(raw);
      if (message?.type === 'build-error') this.emitBuildError(target, message);
    });
    running.child.once('exit', () => {
      const current = this.running.get(target.key);
      void current?.then((entry) => {
        if (entry !== running) return;
        this.running.delete(target.key);
        this.reservedPorts.delete(running.port);
        rmSync(running.home, { recursive: true, force: true });
      });
    });
  }

  private async spawn(target: ViteTarget, port: number, bridgeScript: string): Promise<RunningVite> {
    const home = mkdtempSync(path.join(os.tmpdir(), 'studio-vite-'));
    const child = fork(RUNNER_FILE, [], {
      cwd: path.resolve(target.root),
      env: childEnv(home),
      execArgv: runnerExecArgv(),
      stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
      serialization: 'json',
    });
    const init: ParentToRunner = { type: 'init', root: path.resolve(target.root), port, cacheDir: path.resolve(target.cacheDir), bridgeScript };
    try {
      const ready = waitForReady(child);
      child.send(init);
      await ready;
    } catch (error) {
      await stopChild(child);
      rmSync(home, { recursive: true, force: true });
      throw error;
    }
    return { child, home, port, url: `http://127.0.0.1:${port}/` };
  }

  private async start(target: ViteTarget): Promise<RunningVite> {
    const bridgeScript = await this.deps.bridgeScript();
    let lastError: unknown = null;
    for (let attempt = 0; attempt < MAX_START_ATTEMPTS; attempt += 1) {
      const port = await this.nextFreePort();
      try {
        const running = await this.spawn(target, port, bridgeScript);
        if (this.stopped) {
          await stopChild(running.child);
          throw new Error('Preview service is stopped');
        }
        this.watchChild(target, running);
        return running;
      } catch (error) {
        lastError = error;
        this.reservedPorts.delete(port);
        if (!isPortInUse(error)) break;
      }
    }
    throw lastError instanceof Error ? lastError : new Error('Vite server failed to start');
  }
}
