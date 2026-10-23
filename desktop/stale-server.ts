import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export interface ServerPidRecord {
  pid: number;
  startedAt: string;
}

const SERVER_MARKERS = ['server/index.js', 'src/server/index.ts'];
const KILL_WAIT_MS = 3000;

export function writeServerPid(file: string, pid: number): void {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify({ pid, startedAt: new Date().toISOString() })}\n`);
}

export function clearServerPid(file: string): void {
  rmSync(file, { force: true });
}

function readRecord(file: string): ServerPidRecord | null {
  try {
    const parsed = JSON.parse(readFileSync(file, 'utf8')) as Partial<ServerPidRecord>;
    return Number.isInteger(parsed.pid) ? (parsed as ServerPidRecord) : null;
  } catch {
    return null;
  }
}

function orphanCommand(pid: number): string {
  try {
    const out = execFileSync('/bin/ps', ['-o', 'ppid=,command=', '-p', String(pid)], { encoding: 'utf8' }).trim();
    const match = /^(\d+)\s+(.*)$/s.exec(out);
    return match && match[1] === '1' ? (match[2] ?? '') : '';
  } catch {
    return '';
  }
}

function groupAlive(pid: number): boolean {
  try {
    process.kill(-pid, 0);
    return true;
  } catch {
    return false;
  }
}

function signalGroup(pid: number, signal: NodeJS.Signals): void {
  try {
    process.kill(-pid, signal);
  } catch {
    return;
  }
}

async function waitGroupGone(pid: number, ms: number): Promise<boolean> {
  const deadline = Date.now() + ms;
  while (groupAlive(pid) && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 100));
  return !groupAlive(pid);
}

export async function cleanStaleServer(file: string): Promise<number | null> {
  const record = readRecord(file);
  clearServerPid(file);
  if (!record || !SERVER_MARKERS.some((marker) => orphanCommand(record.pid).includes(marker))) return null;
  signalGroup(record.pid, 'SIGTERM');
  if (!(await waitGroupGone(record.pid, KILL_WAIT_MS))) signalGroup(record.pid, 'SIGKILL');
  return record.pid;
}
