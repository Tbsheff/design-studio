import path from "node:path";

import type { StudioEvent, StudioEventInput } from "../../shared/contracts.js";
import { assertSafeId } from "../platform/errors/index.js";
import { bindEventBus } from "./event-core.js";
import { readSeqFloors } from "./event-file.js";
import type { SeqFloor } from "./event-file.js";
import { fanOut, openLog, sinceLog } from "./event-log.js";
import type { EventListener, ProjectLog } from "./event-log.js";
import { flushLog, record, releaseReserved } from "./event-writer.js";

interface EventBus {
  emit: (event: StudioEventInput) => StudioEvent;
  since: (projectId: string, afterSeq: number) => Promise<StudioEvent[]>;
  subscribe: (projectId: string, listener: EventListener) => () => void;
}

interface FlushableEventBus extends EventBus {
  flush: () => Promise<void>;
}

const createEventBus = (
  dataDir: string,
  floors: ReadonlyMap<string, SeqFloor>
): FlushableEventBus => {
  const logs = new Map<string, ProjectLog>();

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

    const log = openLog(file, floors.get(projectId) ?? null);

    logs.set(projectId, log);

    return log;
  };

  const emit = (input: StudioEventInput): StudioEvent => {
    const log = logFor(input.projectId);
    const recorded = record(log, input);

    fanOut(log, recorded);

    return recorded.event;
  };

  const flush = async (): Promise<void> => {
    const all = [...logs.values()];

    for (const log of all) {
      flushLog(log);
    }

    await Promise.all(all.map((log) => releaseReserved(log)));
  };

  const since = async (
    projectId: string,
    afterSeq: number
  ): Promise<StudioEvent[]> => await sinceLog(logFor(projectId), afterSeq);

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

const openEventBus = async (dataDir: string): Promise<FlushableEventBus> => {
  const bus = createEventBus(dataDir, await readSeqFloors(dataDir));

  bindEventBus(bus);

  return bus;
};

export { createEventBus, openEventBus };

export type { EventBus, FlushableEventBus };
