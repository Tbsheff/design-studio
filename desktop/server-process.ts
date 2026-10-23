import { spawn, type ChildProcess } from 'node:child_process';
import { createWriteStream, mkdirSync, type WriteStream } from 'node:fs';
import path from 'node:path';
import type { Env } from './env.js';

export interface ServerOptions {
  cwd: string;
  args: string[];
  execPath: string;
  env: Env;
  studioOrigin: string;
  logFile: string;
  echo: boolean;
}

export interface ServerExit {
  code: number | null;
  signal: NodeJS.Signals | null;
}

export interface ServerHandle {
  pid: number;
  child: ChildProcess;
  ready: Promise<void>;
  exited: Promise<ServerExit>;
  stop(): Promise<void>;
}

const READY_LINE = 'Design Studio running at';
const READY_TIMEOUT_MS = 90_000;
const POLL_MS = 200;
const TERM_GRACE_MS = 6000;
const KILL_GRACE_MS = 2000;

function openLog(file: string): WriteStream {
  mkdirSync(path.dirname(file), { recursive: true });
  const log = createWriteStream(file, { flags: 'a' });
  log.write(`\n--- server start ${new Date().toISOString()} ---\n`);
  return log;
}

function pipeOutput(child: ChildProcess, log: WriteStream, echo: boolean, onLine: (text: string) => void): void {
  const forward = (target: NodeJS.WriteStream) => (chunk: Buffer) => {
    log.write(chunk);
    if (echo) target.write(chunk);
    onLine(chunk.toString('utf8'));
  };
  child.stdout?.on('data', forward(process.stdout));
  child.stderr?.on('data', forward(process.stderr));
}

function exited(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return Promise.resolve();
  return new Promise((resolve) => child.once('exit', () => resolve()));
}

function within(promise: Promise<void>, ms: number): Promise<boolean> {
  return Promise.race([promise.then(() => true), new Promise<boolean>((resolve) => setTimeout(() => resolve(false), ms))]);
}

function signalGroup(pid: number, signal: NodeJS.Signals | 0): boolean {
  try {
    process.kill(-pid, signal);
    return true;
  } catch {
    return false;
  }
}

function groupAlive(pid: number): boolean {
  return signalGroup(pid, 0);
}

async function answers(origin: string): Promise<boolean> {
  try {
    const res = await fetch(`${origin}/`);
    return res.ok;
  } catch {
    return false;
  }
}

async function pollUntilAnswer(origin: string, isDone: () => boolean): Promise<void> {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < deadline && !isDone()) {
    if (await answers(origin)) return;
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
  if (!isDone()) throw new Error(`studio server did not answer ${origin} within ${READY_TIMEOUT_MS} ms`);
}

function waitReady(child: ChildProcess, origin: string, seenLine: Promise<void>): Promise<void> {
  let settled = false;
  const failed = exited(child).then(() => {
    if (!settled) throw new Error(`studio server exited during startup (code ${child.exitCode ?? child.signalCode})`);
  });
  const polled = pollUntilAnswer(origin, () => settled);
  return Promise.race([seenLine, polled, failed]).finally(() => {
    settled = true;
  });
}

async function groupGone(pid: number, ms: number): Promise<boolean> {
  const deadline = Date.now() + ms;
  while (groupAlive(pid) && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 50));
  return !groupAlive(pid);
}

async function stopGroup(child: ChildProcess, pid: number): Promise<void> {
  signalGroup(pid, 'SIGTERM');
  const stopped = await within(exited(child), TERM_GRACE_MS);
  if (!stopped || !(await groupGone(pid, KILL_GRACE_MS))) signalGroup(pid, 'SIGKILL');
  await within(exited(child), KILL_GRACE_MS);
}

export function startServer(options: ServerOptions): ServerHandle {
  const log = openLog(options.logFile);
  const child = spawn(options.execPath, options.args, {
    cwd: options.cwd,
    env: options.env,
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  });
  if (child.pid === undefined) throw new Error('studio server did not start');
  const pid = child.pid;
  let markReady: () => void = () => undefined;
  const seenLine = new Promise<void>((resolve) => {
    markReady = resolve;
  });
  pipeOutput(child, log, options.echo, (text) => {
    if (text.includes(READY_LINE)) markReady();
  });
  let stopping: Promise<void> | null = null;
  return {
    pid,
    child,
    ready: waitReady(child, options.studioOrigin, seenLine),
    exited: exited(child).then(() => ({ code: child.exitCode, signal: child.signalCode })),
    stop() {
      stopping ??= stopGroup(child, pid).finally(() => log.end());
      return stopping;
    },
  };
}
