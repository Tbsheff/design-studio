import { execFileSync, spawn, type ChildProcess } from 'node:child_process';
import path from 'node:path';
import { RENDER_BACKEND_ENV, RENDER_SOCKET_ENV, RENDER_TOKEN_ENV } from '../../src/shared/render-rpc';
import { ROOT } from './server';

const E2E_RENDER_ENV = 'STUDIO_E2E_RENDER';
const READY = 'studio render host ready ';

interface RenderHostHandle {
  pid: number;
  env: Record<string, string>;
  child: ChildProcess;
}

function hostEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  env.STUDIO_RENDER_HOST_STDIN = '1';
  return env;
}

function hostCommand(): { file: string; args: string[]; env: NodeJS.ProcessEnv } {
  return { file: path.join(ROOT, 'node_modules', '.bin', 'electron'), args: [path.join(ROOT, 'desktop', 'dist', 'render-host.js')], env: hostEnv() };
}

export function startRenderHost(): Promise<RenderHostHandle> {
  const command = hostCommand();
  const child = spawn(command.file, command.args, { cwd: ROOT, env: command.env, stdio: ['pipe', 'pipe', 'pipe'], detached: true });
  return new Promise((resolve, reject) => {
    let output = '';
    const timer = setTimeout(() => reject(new Error(`render host did not start: ${output}`)), 30_000);
    child.on('exit', (code) => reject(new Error(`render host exited ${code}: ${output}`)));
    child.stderr?.on('data', (chunk: Buffer) => {
      output += chunk.toString('utf8');
    });
    child.stdout?.on('data', (chunk: Buffer) => {
      output += chunk.toString('utf8');
      const line = output.split('\n').find((entry) => entry.startsWith(READY));
      if (!line || child.pid === undefined) return;
      clearTimeout(timer);
      const info = JSON.parse(line.slice(READY.length)) as { socket: string; token: string };
      resolve({ pid: child.pid, child, env: { [RENDER_BACKEND_ENV]: 'electron', [RENDER_SOCKET_ENV]: info.socket, [RENDER_TOKEN_ENV]: info.token } });
    });
  });
}

export function wantsElectronRenderer(env: NodeJS.ProcessEnv = process.env): boolean {
  const asked = env[E2E_RENDER_ENV];
  if (asked) return asked === 'electron';
  return Boolean(env.STUDIO_E2E_APP);
}

export async function startE2eRenderer(): Promise<number | undefined> {
  if (!wantsElectronRenderer()) return undefined;
  execFileSync('npm', ['run', 'desktop:build'], { cwd: ROOT, stdio: 'inherit' });
  const host = await startRenderHost();
  Object.assign(process.env, host.env);
  console.log(`[e2e] electron render host pid ${host.pid}`);
  return host.pid;
}

export function stopRenderHost(pid: number): void {
  try {
    process.kill(-pid, 'SIGTERM');
  } catch {
    return;
  }
}
