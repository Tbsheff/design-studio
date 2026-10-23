import { execFileSync } from 'node:child_process';

export interface ProcessRow {
  pid: number;
  ppid: number;
  pgid: number;
  command: string;
}

export function listProcesses(): ProcessRow[] {
  const out = execFileSync('ps', ['-A', '-o', 'pid=,ppid=,pgid=,command='], { encoding: 'utf8' });
  return out
    .split('\n')
    .map((line) => /^\s*(\d+)\s+(\d+)\s+(\d+)\s+(.*)$/.exec(line))
    .filter((match): match is RegExpExecArray => match !== null)
    .map((match) => ({ pid: Number(match[1]), ppid: Number(match[2]), pgid: Number(match[3]), command: match[4] ?? '' }));
}

export function processCommandAndEnv(pid: number): string {
  return execFileSync('ps', ['eww', '-o', 'command=', '-p', String(pid)], { encoding: 'utf8' });
}

export function processEnvKeys(pid: number): string[] {
  return [...processCommandAndEnv(pid).matchAll(/(?:^|\s)([A-Z][A-Z0-9_]*)=/g)].map((match) => match[1] ?? '');
}

export function groupMembers(pgid: number): ProcessRow[] {
  return listProcesses().filter((row) => row.pgid === pgid);
}

export function alive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
