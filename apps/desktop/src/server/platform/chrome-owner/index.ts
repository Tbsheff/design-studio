import { execFile } from "node:child_process";
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const OWNER_FILE = "render-chrome.json";
const OWNER_SWITCH = "--studio-render-owner";
const PS_PATH = "/bin/ps";
const PS_TIMEOUT_MS = 3000;
const PS_MAX_BUFFER = 16_777_216;

const runFile = promisify(execFile);

const ownedPids = new Set<number>();

interface ChromeRecord {
  readonly marker: string;
  readonly pid: number;
}

interface ProcessLine {
  readonly line: string;
  readonly parent: number;
  readonly pid: number;
}

const toOwnerFile = (dataDir: string): string => path.join(dataDir, OWNER_FILE);

const toOwnerArg = (marker: string): string => `${OWNER_SWITCH}=${marker}`;

const createOwnerMarker = (): string => `${process.pid}-${Date.now()}`;

const isChromeRecord = (value: unknown): value is ChromeRecord => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  if (!("marker" in value && "pid" in value)) {
    return false;
  }

  return Number.isInteger(value.pid) && typeof value.marker === "string";
};

const hasOwnerArg = (line: string, marker: string): boolean => {
  const arg = toOwnerArg(marker);

  return line.endsWith(arg) || line.includes(`${arg} `);
};

const toProcessLine = (raw: string): ProcessLine => {
  const line = raw.trim();
  const [pid = "", parent = ""] = line.split(/\s+/u);

  return { line, parent: Number(parent), pid: Number(pid) };
};

const listProcesses = async (): Promise<ProcessLine[]> => {
  try {
    const { stdout } = await runFile(
      PS_PATH,
      ["-A", "-o", "pid=,ppid=,args="],
      {
        maxBuffer: PS_MAX_BUFFER,
        timeout: PS_TIMEOUT_MS,
      }
    );

    return stdout.split("\n").map((raw) => toProcessLine(raw));
  } catch {
    return [];
  }
};

const stopProcess = (target: number): boolean => {
  try {
    process.kill(target, "SIGKILL");

    return true;
  } catch {
    return false;
  }
};

const stopChromeGroup = (pid: number): void => {
  if (!stopProcess(-pid)) {
    stopProcess(pid);
  }
};

const stopOwnedChrome = (): void => {
  for (const pid of ownedPids) {
    stopChromeGroup(pid);
  }
};

const isOwnedChrome = async (record: ChromeRecord): Promise<boolean> => {
  const processes = await listProcesses();

  return processes.some(
    (entry) =>
      entry.pid === record.pid && hasOwnerArg(entry.line, record.marker)
  );
};

const setRecordFile = async (file: string, text: string): Promise<boolean> => {
  try {
    await writeFile(file, text, "utf-8");

    return true;
  } catch {
    return false;
  }
};

const deleteRecordFile = async (file: string): Promise<boolean> => {
  try {
    await rm(file, { force: true });

    return true;
  } catch {
    return false;
  }
};

const getRecord = async (file: string): Promise<ChromeRecord | null> => {
  try {
    const parsed: unknown = JSON.parse(await readFile(file, "utf-8"));

    if (isChromeRecord(parsed)) {
      return parsed;
    }

    return null;
  } catch {
    return null;
  }
};

const deleteStaleChrome = async (dataDir: string): Promise<boolean> => {
  const file = toOwnerFile(dataDir);
  const record = await getRecord(file);

  if (record === null) {
    return false;
  }

  const isOwned = await isOwnedChrome(record);

  if (isOwned) {
    stopChromeGroup(record.pid);
  }

  await deleteRecordFile(file);

  return isOwned;
};

const createChromeRecord = async (
  file: string,
  marker: string
): Promise<number | null> => {
  const processes = await listProcesses();

  const owned = processes.find(
    (entry) => entry.parent === process.pid && hasOwnerArg(entry.line, marker)
  );

  if (!owned) {
    return null;
  }

  await setRecordFile(file, JSON.stringify({ marker, pid: owned.pid }));

  if (ownedPids.size === 0) {
    process.once("exit", stopOwnedChrome);
  }

  ownedPids.add(owned.pid);

  return owned.pid;
};

const deleteChromeRecord = async (
  file: string,
  pid: number | null
): Promise<void> => {
  if (pid !== null) {
    ownedPids.delete(pid);
  }

  if (ownedPids.size === 0) {
    process.off("exit", stopOwnedChrome);
  }

  await deleteRecordFile(file);
};

export {
  createChromeRecord,
  createOwnerMarker,
  deleteChromeRecord,
  deleteStaleChrome,
  toOwnerArg,
  toOwnerFile,
};
