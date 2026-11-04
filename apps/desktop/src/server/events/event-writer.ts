import { appendFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type { StudioEventInput } from "@design-studio/contracts";

import { report, toRecorded, trimRing } from "./event-log.js";
import type { ProjectLog, RecordedEvent } from "./event-log.js";

const FLUSH_DELAY_MS = 5;
const SEQ_RESERVE = 1000;

const writeSeqFile = async (
  log: ProjectLog,
  previous: Promise<void>,
  value: number
): Promise<void> => {
  await previous;

  try {
    await mkdir(path.dirname(log.seqFile), { recursive: true });
    await writeFile(log.seqFile, `${value}\n`);
  } catch (error) {
    report("seq reserve", { error });

    if (log.reserved === value) {
      log.reserved = 0;
    }
  }
};

const persistReserved = (log: ProjectLog, value: number): void => {
  log.reserved = value;
  log.seqChain = writeSeqFile(log, log.seqChain, value);
};

const reserveAhead = (log: ProjectLog, seq: number): void => {
  if (seq + SEQ_RESERVE / 2 > log.reserved) {
    persistReserved(log, seq + SEQ_RESERVE);
  }
};

const releaseReserved = async (log: ProjectLog): Promise<void> => {
  await log.chain;

  if (log.unflushed.length === 0 && log.reserved > log.lastSeq) {
    persistReserved(log, log.lastSeq);
  }

  await log.seqChain;
};

const toLines = (batch: readonly RecordedEvent[]): string =>
  batch.map((recorded) => `${recorded.line}\n`).join("");

const isMissing = (error: NodeJS.ErrnoException): boolean =>
  error.code === "ENOENT";

const appendLines = async (log: ProjectLog, text: string): Promise<void> => {
  if (!log.dirReady) {
    await mkdir(path.dirname(log.file), { recursive: true });
    log.dirReady = true;
  }

  try {
    await appendFile(log.file, text);
  } catch (error) {
    if (!isMissing(error as NodeJS.ErrnoException)) {
      throw error;
    }

    await mkdir(path.dirname(log.file), { recursive: true });
    await appendFile(log.file, text);
  }
};

const writeBatch = async (
  log: ProjectLog,
  previous: Promise<void>
): Promise<void> => {
  await previous;
  const batch = [...log.unflushed];

  if (batch.length === 0) {
    return;
  }

  try {
    await appendLines(log, toLines(batch));
    log.unflushed.splice(0, batch.length);
    trimRing(log);
  } catch (error) {
    report("append", { error });
  }
};

const flushLog = (log: ProjectLog): void => {
  if (log.timer !== null) {
    clearTimeout(log.timer);
  }

  log.timer = null;

  if (log.unflushed.length === 0) {
    return;
  }

  log.chain = writeBatch(log, log.chain);
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
