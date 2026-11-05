import path from "node:path";

import type {
  StudioEvent,
  StudioEventInput,
  Version,
} from "@design-studio/contracts";
import { Effect, Result } from "effect";

import { logError } from "../platform/logger/index.js";
import { readEventFile } from "./event-file.js";
import type { SeqFloor } from "./event-file.js";
import type { EventRunner } from "./event-runner.js";

const RING_SIZE = 5000;
const EVENT_FILES_MAX = 20;

interface RecordedEvent {
  readonly event: StudioEvent;
  readonly line: string;
}

const lines = new WeakMap<StudioEvent, string>();

type EventListener = (event: StudioEvent, line: string) => void;

interface ProjectLog {
  chain: Promise<void>;
  dirReady: boolean;
  file: string;
  filling: Promise<void> | null;
  lastSeq: number;
  listeners: Set<EventListener>;
  reserved: number;
  ring: StudioEvent[];
  readonly run: EventRunner;
  seqChain: Promise<void>;
  seqFile: string;
  timer: NodeJS.Timeout | null;
  unflushed: RecordedEvent[];
}

const report = (label: string, cause: { error: unknown }): void => {
  logError(`[events] ${label} failed`, cause.error);
};

const sampleVersion = (version: Version): Version => {
  if (version.changedFiles.length <= EVENT_FILES_MAX) {
    return version;
  }

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
  if (input.type !== "version.created") {
    return input;
  }

  return { ...input, version: sampleVersion(input.version) };
};

const openLog = (
  logFile: string,
  floor: SeqFloor | null,
  runner: EventRunner
): ProjectLog => ({
  chain: Promise.resolve(),
  dirReady: false,
  file: logFile,
  filling: null,
  lastSeq: floor?.lastSeq ?? 0,
  listeners: new Set(),
  reserved: floor?.reserved ?? 0,
  ring: [],
  run: runner,
  seqChain: Promise.resolve(),
  seqFile: path.join(path.dirname(logFile), "events.seq"),
  timer: null,
  unflushed: [],
});

const trimRing = (log: ProjectLog): void => {
  const keep = Math.max(RING_SIZE, log.unflushed.length);

  if (log.ring.length > keep) {
    log.ring.splice(0, log.ring.length - keep);
  }
};

const toRecorded = (
  log: ProjectLog,
  input: StudioEventInput
): RecordedEvent => {
  const event = {
    ...slimInput(input),
    seq: log.lastSeq + 1,
    ts: Date.now(),
  } as StudioEvent;

  const line = JSON.stringify(event);

  lines.set(event, line);

  return { event, line };
};

const lineOf = (event: StudioEvent): string =>
  lines.get(event) ?? JSON.stringify(event);

const runListener = (
  listener: EventListener,
  recorded: RecordedEvent
): void => {
  const outcome = Result.try({
    catch: (error) => error,
    try: () => listener(recorded.event, recorded.line),
  });

  if (Result.isFailure(outcome)) {
    report("listener", { error: outcome.failure });
  }
};

const fanOut = (log: ProjectLog, recorded: RecordedEvent): void => {
  for (const listener of new Set(log.listeners)) {
    runListener(listener, recorded);
  }
};

const bySeq = (events: readonly StudioEvent[]): StudioEvent[] => {
  const unique = new Map<number, StudioEvent>();

  for (const event of events) {
    unique.set(event.seq, event);
  }

  return [...unique.values()].toSorted((left, right) => left.seq - right.seq);
};

const getStoredEvents = (log: ProjectLog): Effect.Effect<StudioEvent[]> =>
  Effect.promise(() => readEventFile<StudioEvent>(log.file));

const storedSince = Effect.fn("EventLog.storedSince")(function* run(
  log: ProjectLog,
  afterSeq: number
) {
  const tail = [...log.ring];
  const stored = yield* getStoredEvents(log);

  return bySeq([...stored, ...tail]).filter((event) => event.seq > afterSeq);
});

const fillRing = Effect.fn("EventLog.fillRing")(function* run(log: ProjectLog) {
  const stored = yield* getStoredEvents(log);
  const firstSeq = log.ring[0]?.seq ?? Number.POSITIVE_INFINITY;
  const older = stored.filter((event) => event.seq < firstSeq);

  log.ring = [...older, ...log.ring];
  trimRing(log);
});

const ensureFilled = Effect.fn("EventLog.ensureFilled")(function* run(
  log: ProjectLog
) {
  const filling = log.filling ?? log.run.toPromise(fillRing(log));

  log.filling = filling;
  yield* Effect.promise(() => filling);
});

const sinceLog = Effect.fn("EventLog.sinceLog")(function* run(
  log: ProjectLog,
  afterSeq: number
) {
  yield* ensureFilled(log);
  const [first] = log.ring;

  if (!first || first.seq <= afterSeq + 1) {
    return log.ring.filter((event) => event.seq > afterSeq);
  }

  return yield* storedSince(log, afterSeq);
});

export { fanOut, lineOf, openLog, report, sinceLog, toRecorded, trimRing };

export type { EventListener, ProjectLog, RecordedEvent };
