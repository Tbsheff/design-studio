import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnDetachedToLog } from './logged-spawn';
import { claudeHomeFor, writeSkillsFixture } from './skills-fixture';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const E2E_PORT_OFFSET = Number(process.env.STUDIO_E2E_PORT_OFFSET ?? 0);
const E2E_GROUP = process.env.STUDIO_E2E_GROUP ?? 'default';
export const STUDIO_PORT = 4270 + E2E_PORT_OFFSET;
export const PREVIEW_PORT = 4271 + E2E_PORT_OFFSET;
export const VITE_PORT_BASE = 5300 + E2E_PORT_OFFSET * 10;
export const BASE_URL = `http://127.0.0.1:${STUDIO_PORT}`;
export const PREVIEW_FRAGMENT = `.localhost:${PREVIEW_PORT}/`;
export function previewOriginFor(projectId: string): string {
  const hex = [...Buffer.from(projectId, 'utf8')].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `http://p-${hex}.localhost:${PREVIEW_PORT}`;
}
const STATE_FILE = path.join(ROOT, 'test-results', `e2e-state-${E2E_GROUP}.json`);
const LOG_DIR = path.join(ROOT, 'test-results', `server-logs-${E2E_GROUP}`);

interface E2eState {
  dataDir: string;
  workDir: string;
  pid: number;
  renderHostPid?: number;
}

export function readState(): E2eState {
  return JSON.parse(readFileSync(STATE_FILE, 'utf8')) as E2eState;
}

export function writeState(state: E2eState): void {
  mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

async function waitForHttp(url: string, timeoutMs: number, isAlive: () => boolean): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!isAlive()) throw new Error('studio server exited during startup');
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw new Error(`studio server did not answer ${url} within ${timeoutMs}ms`);
}

function serverCommand(): { file: string; args: string[]; env: Record<string, string> } {
  const packagedApp = process.env.STUDIO_E2E_APP;
  if (!packagedApp) return { file: path.join(ROOT, 'node_modules', '.bin', 'tsx'), args: ['src/server/index.ts'], env: {} };
  const resources = path.join(packagedApp, 'Contents', 'Resources');
  return {
    file: path.join(packagedApp, 'Contents', 'MacOS', 'Design Studio'),
    args: [path.join(resources, 'server', 'index.js')],
    env: { ELECTRON_RUN_AS_NODE: '1', STUDIO_RESOURCES_DIR: resources },
  };
}

export function projectsDirFor(dataDir: string): string {
  return path.join(path.dirname(dataDir), 'Design Studio');
}

export async function startServer(dataDir: string): Promise<{ pid: number; listenMs: number }> {
  mkdirSync(LOG_DIR, { recursive: true });
  const claudeHome = process.env.STUDIO_E2E_CLAUDE_HOME ?? claudeHomeFor(dataDir);
  writeSkillsFixture(claudeHome);
  const started = Date.now();
  const command = serverCommand();
  const child = spawnDetachedToLog(
    command.file,
    command.args,
    {
      cwd: ROOT,
      env: {
        ...process.env,
        ...command.env,
        STUDIO_AGENT: 'mock',
        STUDIO_FETCH_ALLOW_LOOPBACK: '1',
        STUDIO_DATA_DIR: dataDir,
        STUDIO_PROJECTS_DIR: projectsDirFor(dataDir),
        STUDIO_CLAUDE_HOME: claudeHome,
        STUDIO_PORT: String(STUDIO_PORT),
        STUDIO_PREVIEW_PORT: String(PREVIEW_PORT),
        STUDIO_VITE_PORT_BASE: String(VITE_PORT_BASE),
      },
    },
    path.join(LOG_DIR, `server-${Date.now()}.log`),
  );
  let alive = true;
  child.on('exit', () => {
    alive = false;
  });
  child.unref();
  await waitForHttp(`${BASE_URL}/`, 90_000, () => alive);
  if (child.pid === undefined) throw new Error('studio server has no pid');
  return { pid: child.pid, listenMs: Date.now() - started };
}

function processAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export async function stopServer(pid: number): Promise<void> {
  if (!processAlive(pid)) return;
  try {
    process.kill(-pid, 'SIGTERM');
  } catch {
    process.kill(pid, 'SIGTERM');
  }
  const deadline = Date.now() + 10_000;
  while (processAlive(pid) && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 100));
  if (processAlive(pid)) process.kill(-pid, 'SIGKILL');
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const free = await fetch(`${BASE_URL}/`).then(
      () => false,
      () => true,
    );
    if (free) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

export function stateExists(): boolean {
  return existsSync(STATE_FILE);
}
