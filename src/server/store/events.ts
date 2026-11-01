import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

import type {
  StudioEvent,
  StudioEventInput,
  Version,
} from "../../shared/contracts.js";
import type { EventBus } from "../types.js";
import { assertSafeId } from "./errors.js";

const RING_SIZE = 5000;
const FLUSH_DELAY_MS = 5;
const EVENT_FILES_MAX = 20;

interface ProjectLog {
  file: string;
  lastSeq: number;
  ring: StudioEvent[];
  listeners: Set<(event: StudioEvent) => void>;
  unflushed: StudioEvent[];
  sent: number;
  dirReady: boolean;
  timer: NodeJS.Timeout | null;
  chain: Promise<void>;
}

const report = (label: string, cause: { error: unknown }): void => {
  console.error(`[events] ${label} failed`, cause.error);
};

const parseLine = (line: string): StudioEvent | null => {
  try {
    return JSON.parse(line) as StudioEvent;
  } catch {
    return null;
  }
};

const parseLines = (text: string): StudioEvent[] => {
  const events: StudioEvent[] = [];
  let lastSeq = 0;
  for (const line of text.split("\n")) {
    const event = line.trim() === "" ? null : parseLine(line);
    if (event !== null && event.seq > lastSeq) {
      lastSeq = event.seq;
      events.push(event);
    }
  }
  return events;
};

const readFileEvents = (file: string): StudioEvent[] => {
  try {
    return parseLines(readFileSync(file, "utf-8"));
  } catch {
    return [];
  }
};

const sampleVersion = (version: Version): Version => {
  if (version.changedFiles.length <= EVENT_FILES_MAX) return version;
  return {
    ...version,
    changedFiles: version.changedFiles.slice(0, EVENT_FILES_MAX),
    changedFilesTotal: Math.max(
      version.changedFilesTotal ?? 0,
      version.changedFiles.length
    ),
  };
};

const slimInput = (input: StudioEventInput): StudioEventInput => {
  if (input.type !== "version.created") return input;
  return { ...input, version: sampleVersion(input.version) };
};

const toLines = (events: StudioEvent[]): string =>
  events.map((event) => `${JSON.stringify(event)}\n`).join("");

const appendLines = async (log: ProjectLog, text: string): Promise<void> => {
  if (!log.dirReady) {
    await mkdir(path.dirname(log.file), { recursive: true });
    log.dirReady = true;
  }
  try {
    await appendFile(log.file, text);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    await mkdir(path.dirname(log.file), { recursive: true });
    await appendFile(log.file, text);
  }
};

const writeBatch = async (
  log: ProjectLog,
  previous: Promise<void>,
  batch: StudioEvent[]
): Promise<void> => {
  await previous;
  try {
    await appendLines(log, toLines(batch));
  } catch (error) {
    report("append", { error });
  } finally {
    log.unflushed.splice(0, batch.length);
    log.sent -= batch.length;
  }
};

const flushLog = (log: ProjectLog): void => {
  if (log.timer !== null) clearTimeout(log.timer);
  log.timer = null;
  const batch = log.unflushed.slice(log.sent);
  if (batch.length === 0) return;
  log.sent += batch.length;
  log.chain = writeBatch(log, log.chain, batch);
};

const scheduleFlush = (log: ProjectLog): void => {
  if (log.timer !== null) return;
  log.timer = setTimeout(() => flushLog(log), FLUSH_DELAY_MS);
  log.timer.unref();
};

const flushLogSync = (log: ProjectLog): void => {
  if (log.unflushed.length === 0) return;
  try {
    mkdirSync(path.dirname(log.file), { recursive: true });
    appendFileSync(log.file, toLines(log.unflushed));
    log.unflushed.length = 0;
  } catch (error) {
    report("final append", { error });
  }
};

const openBuses = new Set<Map<string, ProjectLog>>();

const flushAllSync = (): void => {
  for (const logs of openBuses)
    for (const log of logs.values()) flushLogSync(log);
};

const fanOut = (log: ProjectLog, event: StudioEvent): void => {
  for (const listener of [...log.listeners]) {
    try {
      listener(event);
    } catch (error) {
      report("listener", { error });
    }
  }
};

const storedSince = (log: ProjectLog, afterSeq: number): StudioEvent[] => {
  const stored = readFileEvents(log.file);
  const lastStored = stored.at(-1)?.seq ?? 0;
  const pending = log.unflushed.filter((event) => event.seq > lastStored);
  return [...stored, ...pending].filter((event) => event.seq > afterSeq);
};

const openLog = (file: string): ProjectLog => {
  const stored = readFileEvents(file);
  return {
    file,
    lastSeq: stored.at(-1)?.seq ?? 0,
    ring: stored.slice(-RING_SIZE),
    listeners: new Set(),
    unflushed: [],
    sent: 0,
    dirReady: false,
    timer: null,
    chain: Promise.resolve(),
  };
};

const record = (log: ProjectLog, input: StudioEventInput): StudioEvent => {
  const event = {
    ...slimInput(input),
    seq: log.lastSeq + 1,
    ts: Date.now(),
  } as StudioEvent;
  log.lastSeq = event.seq;
  log.ring.push(event);
  if (log.ring.length > RING_SIZE)
    log.ring.splice(0, log.ring.length - RING_SIZE);
  log.unflushed.push(event);
  scheduleFlush(log);
  return event;
};

const sinceLog = (log: ProjectLog, afterSeq: number): StudioEvent[] => {
  const first = log.ring[0];
  if (first === undefined || first.seq <= afterSeq + 1) {
    return log.ring.filter((event) => event.seq > afterSeq);
  }
  return storedSince(log, afterSeq);
};

export interface FlushableEventBus extends EventBus {
  flush: () => Promise<void>;
}

export function createEventBus(dataDir: string): FlushableEventBus {
  const logs = new Map<string, ProjectLog>();

  const logFor = (projectId: string): ProjectLog => {
    const existing = logs.get(projectId);
    if (existing) return existing;
    const log = openLog(
      path.join(
        dataDir,
        "projects",
        assertSafeId(projectId, "projectId"),
        "events.jsonl"
      )
    );
    logs.set(projectId, log);
    return log;
  };

  openBuses.add(logs);
  if (openBuses.size === 1) process.once("exit", flushAllSync);

  return {
    emit(input: StudioEventInput): StudioEvent {
      const log = logFor(input.projectId);
      const event = record(log, input);
      fanOut(log, event);
      return event;
    },

    since(projectId: string, afterSeq: number): StudioEvent[] {
      return sinceLog(logFor(projectId), afterSeq);
    },

    subscribe(
      projectId: string,
      listener: (event: StudioEvent) => void
    ): () => void {
      const log = logFor(projectId);
      log.listeners.add(listener);
      return () => {
        log.listeners.delete(listener);
      };
    },

    async flush(): Promise<void> {
      const all = [...logs.values()];
      for (const log of all) flushLog(log);
      await Promise.all(all.map((log) => log.chain));
    },
  };
}
