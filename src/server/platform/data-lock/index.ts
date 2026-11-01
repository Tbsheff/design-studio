import { closeSync, openSync, readFileSync, rmSync, writeSync } from "node:fs";
import path from "node:path";

const LOCK_FILE = "studio.lock";
const LOCKED_EXIT_CODE = 75;

interface LockInfo {
  pid: number;
  port: number;
  startedAt: string;
}

class DataDirLockedError extends Error {
  public readonly dataDir: string;
  public readonly holder: LockInfo;

  public constructor(dataDir: string, holder: LockInfo) {
    super(
      `Studio data folder ${dataDir} is in use by another studio server (pid ${holder.pid}, http://127.0.0.1:${holder.port}, since ${holder.startedAt}). Stop it, or set STUDIO_DATA_DIR to another folder.`
    );
    this.dataDir = dataDir;
    this.holder = holder;
    this.name = "DataDirLockedError";
  }
}

const lockPath = (dataDir: string): string => path.join(dataDir, LOCK_FILE);

const pidAlive = (pid: number): boolean => {
  try {
    process.kill(pid, 0);

    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
};

const isLockInfo = (value: unknown): value is LockInfo => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  if (!("pid" in value && "port" in value && "startedAt" in value)) {
    return false;
  }

  return (
    Number.isInteger(value.pid) &&
    Number.isInteger(value.port) &&
    typeof value.startedAt === "string"
  );
};

const readLock = (dataDir: string): LockInfo | null => {
  try {
    const parsed: unknown = JSON.parse(
      readFileSync(lockPath(dataDir), "utf-8")
    );

    if (isLockInfo(parsed)) {
      return parsed;
    }

    return null;
  } catch {
    return null;
  }
};

const liveHolder = (dataDir: string, self = process.pid): LockInfo | null => {
  const holder = readLock(dataDir);

  if (holder && holder.pid !== self && pidAlive(holder.pid)) {
    return holder;
  }

  return null;
};

const writeExclusive = (file: string, info: LockInfo): boolean => {
  try {
    const fd = openSync(file, "wx");
    writeSync(fd, `${JSON.stringify(info)}\n`);
    closeSync(fd);

    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") {
      return false;
    }

    throw error;
  }
};

const releaseDataLock = (dataDir: string): void => {
  if (readLock(dataDir)?.pid === process.pid) {
    rmSync(lockPath(dataDir), { force: true });
  }
};

const acquireDataLock = (dataDir: string, port: number): (() => void) => {
  const file = lockPath(dataDir);

  const { pid } = process;

  const info: LockInfo = {
    pid,
    port,
    startedAt: new Date().toISOString(),
  };

  for (let attempt = 0; attempt < 2; attempt += 1) {
    if (writeExclusive(file, info)) {
      return () => releaseDataLock(dataDir);
    }

    const holder = liveHolder(dataDir);

    if (holder) {
      throw new DataDirLockedError(dataDir, holder);
    }

    rmSync(file, { force: true });
  }

  throw new Error(`could not take the data folder lock ${file}`);
};

export {
  acquireDataLock,
  DataDirLockedError,
  liveHolder,
  LOCKED_EXIT_CODE,
  lockPath,
  readLock,
};

export type { LockInfo };
