import { appendFileSync, mkdirSync } from "node:fs";
import path from "node:path";

interface PendingLog {
  file: string;
  unflushed: unknown[];
}

type Reporter = (label: string, cause: { error: unknown }) => void;

interface OpenBus {
  logs: Map<string, PendingLog>;
  report: Reporter;
}

const openBuses = new Set<OpenBus>();

const toLines = (events: readonly unknown[]): string =>
  events.map((event) => `${JSON.stringify(event)}\n`).join("");

const writeUnflushedNow = (log: PendingLog, report: Reporter): void => {
  if (log.unflushed.length === 0) {
    return;
  }

  try {
    mkdirSync(path.dirname(log.file), { recursive: true });
    appendFileSync(log.file, toLines(log.unflushed));
    log.unflushed.length = 0;
  } catch (error) {
    report("final append", { error });
  }
};

const flushAllSync = (): void => {
  for (const bus of openBuses) {
    for (const log of bus.logs.values()) {
      writeUnflushedNow(log, bus.report);
    }
  }
};

const registerExitFlush = (bus: OpenBus): void => {
  openBuses.add(bus);

  if (openBuses.size === 1) {
    process.once("exit", flushAllSync);
  }
};

export { registerExitFlush, toLines };
