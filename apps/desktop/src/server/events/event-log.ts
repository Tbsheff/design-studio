import path from "node:path";

import type {
  StudioEvent,
  StudioEventInput,
  Version,
} from "@design-studio/contracts";
import { Effect, Result } from "effect";

import { logError } from "../platform/logger/index.js";
import { getEventTail } from "./event-file.js";
import type { SeqFloor, SizedEntry } from "./event-file.js";
import type { EventRunner } from "./event-runner.js";

const RING_SIZE = 5000;
const RING_BYTES = 4_194_304;
const STORED_TAIL_BYTES = 16_777_216;
const EVENT_FILES_MAX = 20;

interface RecordedEvent {
  readonly event: StudioEvent;
  readonly line: string;
}

const lines = new WeakMap<StudioEvent, string>();
const sizes = new WeakMap<StudioEvent, number>();

type EventListener = (event: StudioEvent, line: string) => void;

interface ProjectLog {
  chain: Promise<void>;
  dirReady: boolean;
  file: string;
  fileBytes: number | null;
  filling: Promise<void> | null;
  lastSeq: number;
  listeners: Set<EventListener>;
  reserved: number;
  ring: StudioEvent[];
  ringBytes: number;
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
  fileBytes: null,
  filling: null,
  lastSeq: floor?.lastSeq ?? 0,
  listeners: new Set(),
  reserved: floor?.reserved ?? 0,
  ring: [],
  ringBytes: 0,
  run: runner,
  seqChain: Promise.resolve(),
  seqFile: path.join(path.dirname(logFile), "events.seq"),
  timer: null,
  unflushed: [],
});

const toEventBytes = (event: StudioEvent | null): number => {
  if (event === null) {
    return 0;
  }

  return sizes.get(event) ?? 0;
};

const isOverBudget = (log: ProjectLog, kept: number, bytes: number): boolean =>
  kept > log.unflushed.length && (kept > RING_SIZE || bytes > RING_BYTES);

const trimRing = (log: ProjectLog): void => {
  let dropped = 0;
  let bytes = log.ringBytes;

  while (isOverBudget(log, log.ring.length - dropped, bytes)) {
    bytes -= toEventBytes(log.ring[dropped] ?? null);
    dropped += 1;
  }

  if (dropped > 0) {
    log.ring.splice(0, dropped);
    log.ringBytes = bytes;
  }
};

const insertRing = (log: ProjectLog, recorded: RecordedEvent): void => {
  log.ring.push(recorded.event);
  log.ringBytes += recorded.line.length;
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
  sizes.set(event, line.length);

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

const toSizedEvent = (sized: SizedEntry<StudioEvent>): StudioEvent => {
  sizes.set(sized.entry, sized.bytes);

  return sized.entry;
};

const getStoredEvents = (
  log: ProjectLog,
  maxBytes: number
): Effect.Effect<StudioEvent[]> =>
  Effect.promise(() => getEventTail<StudioEvent>(log.file, maxBytes)).pipe(
    Effect.map((tail) => tail.map((sized) => toSizedEvent(sized)))
  );

const toRingBytes = (events: readonly StudioEvent[]): number =>
  events.reduce((total, event) => total + toEventBytes(event), 0);

const storedSince = Effect.fn("EventLog.storedSince")(function* run(
  log: ProjectLog,
  afterSeq: number
) {
  const tail = [...log.ring];
  const stored = yield* getStoredEvents(log, STORED_TAIL_BYTES);

  return bySeq([...stored, ...tail]).filter((event) => event.seq > afterSeq);
});

const fillRing = Effect.fn("EventLog.fillRing")(function* run(log: ProjectLog) {
  const stored = yield* getStoredEvents(log, RING_BYTES);
  const firstSeq = log.ring[0]?.seq ?? Number.POSITIVE_INFINITY;
  const older = stored.filter((event) => event.seq < firstSeq);

  log.ring = [...older, ...log.ring];
  log.ringBytes = toRingBytes(log.ring);
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

export {
  fanOut,
  lineOf,
  openLog,
  insertRing,
  report,
  sinceLog,
  toRecorded,
  trimRing,
};

export type { EventListener, ProjectLog, RecordedEvent };
