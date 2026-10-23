import { closeSync, openSync, readFileSync, rmSync, writeSync } from 'node:fs';
import path from 'node:path';

const LOCK_FILE = 'studio.lock';
export const LOCKED_EXIT_CODE = 75;

export interface LockInfo {
  pid: number;
  port: number;
  startedAt: string;
}

export class DataDirLockedError extends Error {
  constructor(
    readonly dataDir: string,
    readonly holder: LockInfo,
  ) {
    super(`Studio data folder ${dataDir} is in use by another studio server (pid ${holder.pid}, http://127.0.0.1:${holder.port}, since ${holder.startedAt}). Stop it, or set STUDIO_DATA_DIR to another folder.`);
    this.name = 'DataDirLockedError';
  }
}

export function lockPath(dataDir: string): string {
  return path.join(dataDir, LOCK_FILE);
}

function pidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'EPERM';
  }
}

function isLockInfo(value: unknown): value is LockInfo {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return Number.isInteger(record.pid) && Number.isInteger(record.port) && typeof record.startedAt === 'string';
}

export function readLock(dataDir: string): LockInfo | null {
  try {
    const parsed: unknown = JSON.parse(readFileSync(lockPath(dataDir), 'utf8'));
    return isLockInfo(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function liveHolder(dataDir: string, self = process.pid): LockInfo | null {
  const holder = readLock(dataDir);
  return holder && holder.pid !== self && pidAlive(holder.pid) ? holder : null;
}

function writeExclusive(file: string, info: LockInfo): boolean {
  try {
    const fd = openSync(file, 'wx');
    writeSync(fd, `${JSON.stringify(info)}\n`);
    closeSync(fd);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') return false;
    throw error;
  }
}

export function acquireDataLock(dataDir: string, port: number): () => void {
  const file = lockPath(dataDir);
  const info: LockInfo = { pid: process.pid, port, startedAt: new Date().toISOString() };
  for (let attempt = 0; attempt < 2; attempt += 1) {
    if (writeExclusive(file, info)) return () => releaseDataLock(dataDir);
    const holder = liveHolder(dataDir);
    if (holder) throw new DataDirLockedError(dataDir, holder);
    rmSync(file, { force: true });
  }
  throw new Error(`could not take the data folder lock ${file}`);
}

function releaseDataLock(dataDir: string): void {
  if (readLock(dataDir)?.pid === process.pid) rmSync(lockPath(dataDir), { force: true });
}
