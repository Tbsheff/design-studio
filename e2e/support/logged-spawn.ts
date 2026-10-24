import { spawn, type ChildProcess } from 'node:child_process';
import { closeSync, openSync } from 'node:fs';

export function spawnDetachedToLog(
  file: string,
  args: string[],
  options: { cwd: string; env: NodeJS.ProcessEnv },
  logPath: string,
): ChildProcess {
  const fd = openSync(logPath, 'a');
  try {
    return spawn(file, args, { ...options, detached: true, stdio: ['ignore', fd, fd] });
  } finally {
    closeSync(fd);
  }
}
