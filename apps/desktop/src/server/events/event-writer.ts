import { appendFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type { StudioEventInput } from "@design-studio/contracts";
import { Cause, Effect } from "effect";

import { attemptKnown } from "../platform/attempt/index.js";
import type { KnownFailure, Refine } from "../platform/attempt/index.js";
import { report, toRecorded, trimRing } from "./event-log.js";
import type { ProjectLog, RecordedEvent } from "./event-log.js";

const FLUSH_DELAY_MS = 5;
const SEQ_RESERVE = 1000;

const writeSeq = Effect.fn("EventWriter.writeSeq")(function* run(
  log: ProjectLog,
  value: number
) {
  yield* attemptKnown(() =>
    mkdir(path.dirname(log.seqFile), { recursive: true })
  );
  yield* attemptKnown(() => writeFile(log.seqFile, `${value}\n`));
});

const writeSeqFile = Effect.fn("EventWriter.writeSeqFile")(function* run(
  log: ProjectLog,
  previous: Promise<void>,
  value: number
) {
  yield* Effect.promise(() => previous);
  yield* writeSeq(log, value).pipe(
    Effect.catchCause((cause) =>
      Effect.sync(() => {
        report("seq reserve", { error: Cause.squash(cause) });

        if (log.reserved === value) {
          log.reserved = 0;
        }
      })
    )
  );
});

const persistReserved = (log: ProjectLog, value: number): void => {
  log.reserved = value;
  log.seqChain = log.run.toPromise(writeSeqFile(log, log.seqChain, value));
};

const reserveAhead = (log: ProjectLog, seq: number): void => {
  if (seq + SEQ_RESERVE / 2 > log.reserved) {
    persistReserved(log, seq + SEQ_RESERVE);
  }
};

const releaseReserved = Effect.fn("EventWriter.releaseReserved")(function* run(
  log: ProjectLog
) {
  yield* Effect.promise(() => log.chain);

  if (log.unflushed.length === 0 && log.reserved > log.lastSeq) {
    persistReserved(log, log.lastSeq);
  }

  yield* Effect.promise(() => log.seqChain);
});

const toLines = (batch: readonly RecordedEvent[]): string =>
  batch.map((recorded) => `${recorded.line}\n`).join("");

interface MissingFile {
  readonly _tag: "MissingFile";
}

const MISSING_FILE: MissingFile = { _tag: "MissingFile" };

const toMissingFile: Refine<MissingFile> = (cause) => {
  if (cause instanceof Error && "code" in cause && cause.code === "ENOENT") {
    return MISSING_FILE;
  }

  return null;
};

const createLogDir = (log: ProjectLog): Effect.Effect<void, KnownFailure> =>
  attemptKnown(() => mkdir(path.dirname(log.file), { recursive: true }));

const retryMissing = Effect.fn("EventWriter.retryMissing")(function* run(
  log: ProjectLog,
  text: string
) {
  yield* createLogDir(log);
  yield* attemptKnown(() => appendFile(log.file, text));
});

const appendLines = Effect.fn("EventWriter.appendLines")(function* run(
  log: ProjectLog,
  text: string
) {
  if (!log.dirReady) {
    yield* createLogDir(log);
    log.dirReady = true;
  }

  yield* attemptKnown(() => appendFile(log.file, text), toMissingFile).pipe(
    Effect.catchTag("MissingFile", () => retryMissing(log, text))
  );
});

const writeBatch = Effect.fn("EventWriter.writeBatch")(function* run(
  log: ProjectLog,
  previous: Promise<void>
) {
  yield* Effect.promise(() => previous);
  const batch = [...log.unflushed];

  if (batch.length === 0) {
    return;
  }

  yield* appendLines(log, toLines(batch)).pipe(
    Effect.andThen(
      Effect.sync(() => {
        log.unflushed.splice(0, batch.length);
        trimRing(log);
      })
    ),
    Effect.catchCause((cause) =>
      Effect.sync(() => {
        report("append", { error: Cause.squash(cause) });
      })
    )
  );
});

const flushLog = (log: ProjectLog): void => {
  if (log.timer !== null) {
    clearTimeout(log.timer);
  }

  log.timer = null;

  if (log.unflushed.length === 0) {
    return;
  }

  log.chain = log.run.toPromise(writeBatch(log, log.chain));
};

const scheduleFlush = (log: ProjectLog): void => {
  if (log.timer !== null) {
    return;
  }

  log.timer = setTimeout(() => flushLog(log), FLUSH_DELAY_MS);
  log.timer.unref();
};

const record = (log: ProjectLog, input: StudioEventInput): RecordedEvent => {
  const recorded = toRecorded(log, input);

  reserveAhead(log, recorded.event.seq);
  log.lastSeq = recorded.event.seq;
  log.ring.push(recorded.event);
  log.unflushed.push(recorded);
  trimRing(log);
  scheduleFlush(log);

  return recorded;
};

export { flushLog, record, releaseReserved };
