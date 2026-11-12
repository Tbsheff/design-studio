import { createHash } from "node:crypto";
import path from "node:path";

import type { StudioEvent, StudioEventInput } from "@design-studio/contracts";
import { Effect } from "effect";

import { assertSafeId } from "../platform/errors/index.js";
import { bindEventBus } from "./event-core.js";
import { readSeqFloors } from "./event-file.js";
import type { SeqFloor } from "./event-file.js";
import { fanOut, openLog, sinceLog } from "./event-log.js";
import type { EventListener, ProjectLog } from "./event-log.js";
import type { EventRunner } from "./event-runner.js";
import { flushLog, record, releaseReserved } from "./event-writer.js";

interface EventBus {
  emit: (event: StudioEventInput) => StudioEvent;
  since: (projectId: string, afterSeq: number) => Promise<StudioEvent[]>;
  subscribe: (projectId: string, listener: EventListener) => () => void;
}

interface FlushableEventBus extends EventBus {
  flush: () => Promise<void>;
}

const isRepeatStatus = (
  statusKeys: Map<string, string>,
  input: StudioEventInput
): boolean => {
  if (input.type !== "status.changed") {
    return false;
  }

  const key = `${input.projectId}/${input.directionId ?? ""}`;

  const hash = createHash("sha256")
    .update(JSON.stringify(input.status))
    .digest("hex");

  if (statusKeys.get(key) === hash) {
    return true;
  }

  statusKeys.set(key, hash);

  return false;
};

const createEventBus = (
  dataDir: string,
  floors: ReadonlyMap<string, SeqFloor>,
  run: EventRunner
): FlushableEventBus => {
  const logs = new Map<string, ProjectLog>();
  const statusKeys = new Map<string, string>();

  const logFor = (projectId: string): ProjectLog => {
    const existing = logs.get(projectId);

    if (existing) {
      return existing;
    }

    const file = path.join(
      dataDir,
      "projects",
      assertSafeId(projectId, "projectId"),
      "events.jsonl"
    );

    const log = openLog(file, floors.get(projectId) ?? null, run);

    logs.set(projectId, log);

    return log;
  };

  const emit = (input: StudioEventInput): StudioEvent => {
    const log = logFor(input.projectId);

    if (isRepeatStatus(statusKeys, input)) {
      return { ...input, seq: log.lastSeq, ts: Date.now() } as StudioEvent;
    }

    const recorded = record(log, input);

    fanOut(log, recorded);

    return recorded.event;
  };

  const flush = (): Promise<void> => {
    const all = [...logs.values()];

    for (const log of all) {
      flushLog(log);
    }

    return run.toPromise(
      Effect.all(
        all.map((log) => releaseReserved(log)),
        { concurrency: "unbounded", discard: true }
      )
    );
  };

  const since = (projectId: string, afterSeq: number): Promise<StudioEvent[]> =>
    run.toPromise(sinceLog(logFor(projectId), afterSeq));

  const subscribe = (
    projectId: string,
    listener: EventListener
  ): (() => void) => {
    const log = logFor(projectId);

    log.listeners.add(listener);

    return () => {
      log.listeners.delete(listener);
    };
  };

  return { emit, flush, since, subscribe };
};

const openEventBus = async (
  dataDir: string,
  run: EventRunner
): Promise<FlushableEventBus> => {
  const bus = createEventBus(dataDir, await readSeqFloors(dataDir), run);

  bindEventBus(bus);

  return bus;
};

export { createEventBus, openEventBus };

export type { EventBus, FlushableEventBus };
