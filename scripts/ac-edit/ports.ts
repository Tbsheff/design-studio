import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';

export const BACKUP_STATE = path.join(os.tmpdir(), 'studio-ac-edit-state.json');

export function listenersOn(port: number): number[] {
  try {
    return execFileSync('lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-t'], { encoding: 'utf8' })
      .split('\n')
      .filter(Boolean)
      .map(Number);
  } catch {
    return [];
  }
}

export async function killListeners(ports: number[]): Promise<number[]> {
  const pids = [...new Set(ports.flatMap(listenersOn))];
  for (const pid of pids) {
    try {
      process.kill(pid, 'SIGTERM');
    } catch {
      continue;
    }
  }
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline && ports.some((port) => listenersOn(port).length > 0)) await new Promise((resolve) => setTimeout(resolve, 200));
  for (const port of ports) for (const pid of listenersOn(port)) process.kill(pid, 'SIGKILL');
  return pids;
}
