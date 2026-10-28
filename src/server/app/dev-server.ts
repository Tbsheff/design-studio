import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import type { AppLogLine, AppServerStatus, Project } from '../../shared/contracts.js';
import type { EventBus } from '../types.js';
import { installHint } from './install-hint.js';

const MAX_LOG_LINES = 400;
const READY_TIMEOUT_MS = 180_000;
const STOP_GRACE_MS = 4000;
const MAX_LINE = 2000;
const BLOCKED_ENV = /^(STUDIO_|ANTHROPIC_|CLAUDE_|ELECTRON_RUN_AS_NODE$|NODE_OPTIONS$|VITE_)/;
const ANSI = /\u001b\[[0-9;?]*[ -/]*[@-~]/g;
const PROBE_TIMEOUT_MS = 3000;

interface AppServer {
  projectId: string;
  status: AppServerStatus;
  logs: AppLogLine[];
  child: ChildProcess | null;
  ready: Promise<string> | null;
  workTree: string;
}

export interface AppServerDeps {
  bus: EventBus;
  portBase: number;
}

function freePort(start: number): Promise<number> {
  const tryPort = (port: number, left: number): Promise<number> =>
    new Promise((resolve, reject) => {
      const probe = net.createServer();
      probe.unref();
      probe.once('error', () => (left > 0 ? resolve(tryPort(port + 1, left - 1)) : reject(new Error('no free port for the app dev server'))));
      probe.listen(port, '127.0.0.1', () => probe.close(() => resolve(port)));
    });
  return tryPort(start, 200);
}

function canConnect(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: '127.0.0.1' });
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => resolve(false));
  });
}

export function nextBinary(workTree: string, appDir: string): string | null {
  const candidates = [path.join(workTree, appDir, 'node_modules', '.bin', 'next'), path.join(workTree, 'node_modules', '.bin', 'next')];
  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

async function answers(upstream: string): Promise<boolean> {
  try {
    const res = await fetch(upstream, { method: 'GET', redirect: 'manual', signal: AbortSignal.timeout(PROBE_TIMEOUT_MS) });
    await res.body?.cancel().catch(() => undefined);
    return true;
  } catch {
    return false;
  }
}

export function missingNextMessage(workTree: string, appDir: string): string {
  const appRoot = path.join(workTree, appDir);
  const hint = installHint(workTree, appDir);
  return `next is not installed in ${appRoot}. Run ${hint.command} in ${hint.dir}, then press Start. Or start the dev server yourself and use its URL.`;
}

function childEnv(extra: Record<string, string> | undefined, port: number): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  for (const [key, value] of Object.entries(process.env)) if (!BLOCKED_ENV.test(key) && value !== undefined) env[key] = value;
  if (!process.versions.electron) env.PATH = [path.dirname(process.execPath), env.PATH ?? ''].filter(Boolean).join(path.delimiter);
  delete env.NODE_ENV;
  return { ...env, ...extra, PORT: String(port), BROWSER: 'none', NEXT_TELEMETRY_DISABLED: '1', FORCE_COLOR: '0' };
}

export class AppServers {
  private readonly servers = new Map<string, AppServer>();
  private readonly onExit = (): void => {
    for (const server of this.servers.values()) this.killGroup(server.child, 'SIGKILL');
  };

  constructor(private readonly deps: AppServerDeps) {
    process.once('exit', this.onExit);
  }

  private entry(project: Project): AppServer {
    let server = this.servers.get(project.id);
    const mode = project.app?.mode ?? 'managed';
    if (!server) {
      server = {
        projectId: project.id,
        status: { state: 'idle', mode, upstream: null, command: null, message: null, startedAt: null },
        logs: [],
        child: null,
        ready: null,
        workTree: project.directions[0]?.workTree ?? '',
      };
      this.servers.set(project.id, server);
    }
    return server;
  }

  private setStatus(server: AppServer, patch: Partial<AppServerStatus>): void {
    server.status = { ...server.status, ...patch };
    this.deps.bus.emit({ type: 'app.status', projectId: server.projectId, status: server.status });
  }

  private log(server: AppServer, stream: AppLogLine['stream'], chunk: string): void {
    const lines = chunk.replace(ANSI, '').split(/\r?\n/).filter((line) => line.trim() !== '');
    for (const line of lines) server.logs.push({ at: Date.now(), stream, text: line.slice(0, MAX_LINE) });
    if (server.logs.length > MAX_LOG_LINES) server.logs.splice(0, server.logs.length - MAX_LOG_LINES);
  }

  status(project: Project): AppServerStatus {
    const server = this.servers.get(project.id);
    if (server) return server.status;
    const mode = project.app?.mode ?? 'managed';
    return { state: 'idle', mode, upstream: mode === 'url' ? (project.app?.url ?? null) : null, command: null, message: null, startedAt: null };
  }

  logs(projectId: string): AppLogLine[] {
    return [...(this.servers.get(projectId)?.logs ?? [])];
  }

  upstreamOf(projectId: string): string | null {
    const server = this.servers.get(projectId);
    return server?.status.state === 'ready' ? server.status.upstream : null;
  }

  ensure(project: Project): Promise<string> {
    const app = project.app;
    if (!app) return Promise.reject(new Error('project is not an attached app'));
    const server = this.entry(project);
    if (app.mode === 'url') return this.checkUrl(server, new URL(app.url ?? '').origin);
    if (server.ready && server.status.state !== 'failed' && server.status.state !== 'stopped') return server.ready;
    server.workTree = project.directions[0]?.workTree ?? server.workTree;
    server.ready = this.spawnNext(server, project).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      this.log(server, 'studio', message);
      this.setStatus(server, { state: 'failed', message });
      throw error;
    });
    return server.ready;
  }

  private checkUrl(server: AppServer, upstream: string): Promise<string> {
    if (server.status.upstream === upstream && server.status.state === 'ready') return Promise.resolve(upstream);
    if (server.ready && server.status.state === 'starting' && server.status.upstream === upstream) return server.ready;
    this.setStatus(server, { state: 'starting', mode: 'url', upstream, command: null, message: null, startedAt: Date.now() });
    server.ready = answers(upstream).then((up) => {
      if (up) {
        this.setStatus(server, { state: 'ready', message: null });
        return upstream;
      }
      const message = `Nothing answers at ${upstream}. Start your dev server there, or change the URL in the app settings.`;
      this.log(server, 'studio', message);
      this.setStatus(server, { state: 'failed', message });
      throw new Error(message);
    });
    return server.ready;
  }

  private async spawnNext(server: AppServer, project: Project): Promise<string> {
    const app = project.app;
    if (!app) throw new Error('project is not an attached app');
    const appRoot = path.join(server.workTree, app.appDir);
    const binary = nextBinary(server.workTree, app.appDir);
    if (!binary) throw new Error(missingNextMessage(server.workTree, app.appDir));
    const port = await freePort(this.deps.portBase);
    const args = ['dev', '-p', String(port), '-H', '127.0.0.1'];
    const command = `next ${args.join(' ')}`;
    this.setStatus(server, { state: 'starting', mode: 'managed', upstream: null, command, message: null, startedAt: Date.now() });
    this.log(server, 'studio', `Starting ${command} in ${appRoot}`);
    const child = spawn(binary, args, { cwd: appRoot, env: childEnv(app.env, port), detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
    server.child = child;
    child.stdout?.setEncoding('utf8').on('data', (chunk: string) => this.log(server, 'stdout', chunk));
    child.stderr?.setEncoding('utf8').on('data', (chunk: string) => this.log(server, 'stderr', chunk));
    const exited = new Promise<never>((_, reject) => {
      child.once('error', (error) => reject(error));
      child.once('exit', (code, signal) => {
        if (server.child === child) server.child = null;
        const message = `next dev exited (${signal ?? `code ${code ?? 0}`})`;
        this.log(server, 'studio', message);
        if (server.status.state !== 'stopped') this.setStatus(server, { state: server.status.state === 'ready' ? 'stopped' : 'failed', message, upstream: null });
        reject(new Error(message));
      });
    });
    exited.catch(() => undefined);
    const upstream = `http://127.0.0.1:${port}`;
    const deadline = Date.now() + READY_TIMEOUT_MS;
    while (Date.now() < deadline) {
      const up = await Promise.race([canConnect(port), exited]);
      if (up) {
        this.setStatus(server, { state: 'ready', upstream, message: null });
        return upstream;
      }
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    this.killGroup(child, 'SIGKILL');
    throw new Error(`next dev did not open port ${port} within ${READY_TIMEOUT_MS / 1000} s`);
  }

  private killGroup(child: ChildProcess | null, signal: NodeJS.Signals): void {
    if (!child?.pid || child.exitCode !== null) return;
    try {
      process.kill(-child.pid, signal);
    } catch {
      child.kill(signal);
    }
  }

  async stop(projectId: string): Promise<void> {
    const server = this.servers.get(projectId);
    if (!server) return;
    const child = server.child;
    server.ready = null;
    if (server.status.mode === 'managed') this.setStatus(server, { state: 'stopped', upstream: null, message: null });
    if (!child || child.exitCode !== null) return;
    const done = new Promise<void>((resolve) => child.once('exit', () => resolve()));
    this.killGroup(child, 'SIGTERM');
    const timer = setTimeout(() => this.killGroup(child, 'SIGKILL'), STOP_GRACE_MS);
    await done;
    clearTimeout(timer);
    this.killGroup(child, 'SIGKILL');
  }

  async restart(project: Project): Promise<string> {
    await this.stop(project.id);
    return this.ensure(project);
  }

  async stopAll(): Promise<void> {
    await Promise.all([...this.servers.keys()].map((id) => this.stop(id)));
    process.removeListener('exit', this.onExit);
  }
}
