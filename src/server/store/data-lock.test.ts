import { mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { acquireDataLock, DataDirLockedError, lockPath, readLock } from './data-lock.js';

function tempDir(): string {
  return mkdtempSync(path.join(os.tmpdir(), 'studio-lock-'));
}

describe('data dir lock', () => {
  it('writes pid, port and start time, and removes the file on release', () => {
    const dir = tempDir();
    const release = acquireDataLock(dir, 4170);
    expect(readLock(dir)).toMatchObject({ pid: process.pid, port: 4170 });
    release();
    expect(readLock(dir)).toBeNull();
  });

  it('refuses when a live process holds the lock', () => {
    const dir = tempDir();
    writeFileSync(lockPath(dir), JSON.stringify({ pid: process.ppid, port: 4171, startedAt: 'x' }));
    expect(() => acquireDataLock(dir, 4170)).toThrow(DataDirLockedError);
    expect(readLock(dir)?.pid).toBe(process.ppid);
  });

  it('takes over a stale lock whose pid is dead', () => {
    const dir = tempDir();
    writeFileSync(lockPath(dir), JSON.stringify({ pid: 999_999, port: 4171, startedAt: 'x' }));
    const release = acquireDataLock(dir, 4170);
    expect(readLock(dir)).toMatchObject({ pid: process.pid, port: 4170 });
    release();
  });

  it('takes over an unreadable lock file', () => {
    const dir = tempDir();
    writeFileSync(lockPath(dir), 'garbage');
    acquireDataLock(dir, 4170)();
    expect(readLock(dir)).toBeNull();
  });
});
