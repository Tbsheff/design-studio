import { randomBytes } from "node:crypto";

import type {
  Direction,
  Project,
  Version,
  VersionMeta,
} from "../../../shared/contracts.js";
import { bindSaveLanes } from "../../events/save-lanes.js";
import { logError } from "../../platform/logger/index.js";
import type { VersionStore } from "../../types.js";

interface SaveDeps {
  versions: VersionStore;
  publish(
    project: Project,
    direction: Direction,
    version: Version,
    status: boolean,
    versions: VersionStore
  ): Promise<void>;
  failed(project: Project, direction: Direction, message: string): void;
}

interface Lane {
  tail: Promise<void>;
  waiting: number;
  lastSaved: string | null;
}

interface SaveJob {
  readonly deps: SaveDeps;
  readonly direction: Direction;
  readonly lane: Lane;
  readonly meta: VersionMeta;
  readonly pendingId: string;
  readonly project: Project;
  readonly relatives: string[];
  readonly title: string;
}

const PENDING_VERSION = "pending-";
const SAVED_MAX = 2000;
const FAIL_TEXT_MAX = 200;
const lanes = new Map<string, Lane>();
const saved = new Map<string, string>();
const failures = new Map<string, string[]>();
const rawStores = new WeakMap<VersionStore, VersionStore>();

const isPendingVersion = (version: Pick<Version, "id">): boolean =>
  version.id.startsWith(PENDING_VERSION);

const savedVersionId = (id: string): string => saved.get(id) ?? id;

const takeSaveFailures = (projectId: string): string[] => {
  const list = failures.get(projectId) ?? [];

  failures.delete(projectId);

  return list;
};

const unqueuedStore = (store: VersionStore): VersionStore =>
  rawStores.get(store) ?? store;

const remember = (pendingId: string, realId: string): void => {
  if (saved.size > SAVED_MAX) {
    saved.clear();
  }

  saved.set(pendingId, realId);
};

const laneOf = (projectId: string): Lane => {
  const found = lanes.get(projectId);

  if (found) {
    return found;
  }

  const lane: Lane = { lastSaved: null, tail: Promise.resolve(), waiting: 0 };

  lanes.set(projectId, lane);

  return lane;
};

const tailsOf = (projectId: string | null): Promise<void>[] => {
  if (projectId === null) {
    return [...lanes.values()].map((lane) => lane.tail);
  }

  const lane = lanes.get(projectId);

  if (!lane) {
    return [];
  }

  return [lane.tail];
};

const savesSettled = async (projectId: string | null = null): Promise<void> => {
  await Promise.all(tailsOf(projectId));
};

const failText = (error: unknown): string => {
  const text = error instanceof Error ? error.message : String(error);
  const line = text.split("\n").find((part) => part.trim().length > 0) ?? text;

  if (line.length <= FAIL_TEXT_MAX) {
    return line;
  }

  return `${line.slice(0, FAIL_TEXT_MAX - 1)}…`;
};

const savedIdOf = (job: SaveJob, version: Version | null): string | null =>
  version?.id ?? job.lane.lastSaved ?? job.direction.headVersionId ?? null;

const runSave = async (job: SaveJob): Promise<void> => {
  const versions = unqueuedStore(job.deps.versions);
  const committed = await versions.commitFile(
    job.project,
    job.direction,
    job.relatives,
    job.title,
    job.meta
  );
  const version = committed ?? null;

  job.lane.waiting -= 1;
  const savedId = savedIdOf(job, version);

  if (savedId !== null) {
    remember(job.pendingId, savedId);
  }

  if (version === null) {
    return;
  }

  job.lane.lastSaved = version.id;
  await job.deps.publish(
    job.project,
    job.direction,
    version,
    job.lane.waiting === 0,
    versions
  );
};

const failSave = (job: SaveJob, error: unknown): void => {
  job.lane.waiting = Math.max(0, job.lane.waiting - 1);
  logError(`[save-queue] could not save "${job.title}" as a version`, error);
  const message = `"${job.title}" is written to the file but was not saved as a version (${failText(error)}).`;

  failures.set(job.project.id, [
    ...(failures.get(job.project.id) ?? []),
    message,
  ]);
  job.deps.failed(job.project, job.direction, message);
};

const runJob = async (job: SaveJob): Promise<void> => {
  try {
    await runSave(job);
  } catch (error) {
    failSave(job, error);
  }
};

const saveLater = (
  deps: SaveDeps,
  project: Project,
  direction: Direction,
  relatives: string[],
  title: string,
  meta: VersionMeta
): Version => {
  const pending: Version = {
    changedFiles: relatives,
    createdAt: Date.now(),
    directionId: direction.id,
    id: `${PENDING_VERSION}${randomBytes(8).toString("hex")}`,
    meta,
    parentId: direction.headVersionId,
    title,
  };

  const lane = laneOf(project.id);
  const job: SaveJob = {
    deps,
    direction,
    lane,
    meta,
    pendingId: pending.id,
    project,
    relatives,
    title,
  };

  lane.waiting += 1;
  lane.tail = lane.tail.then(() => runJob(job));

  return pending;
};

const projectIdOf = (args: unknown[]): string | null => {
  const first = args[0] as { id?: unknown; directions?: unknown } | undefined;

  if (
    first &&
    typeof first.id === "string" &&
    Array.isArray(first.directions)
  ) {
    return first.id;
  }

  return null;
};

const toSavedArg = (arg: unknown): unknown => {
  if (typeof arg === "string") {
    return savedVersionId(arg);
  }

  return arg;
};

const queued =
  (target: VersionStore, value: (...all: unknown[]) => unknown) =>
  async (...args: unknown[]): Promise<unknown> => {
    await savesSettled(projectIdOf(args));

    return value.apply(
      target,
      args.map((arg) => toSavedArg(arg))
    );
  };

const withSaveQueue = (store: VersionStore): VersionStore => {
  const proxy = new Proxy(store, {
    get(target, key, receiver): unknown {
      const value: unknown = Reflect.get(target, key, receiver);

      if (typeof value !== "function" || key === "untrackedCount") {
        return value;
      }

      return queued(target, value as (...all: unknown[]) => unknown);
    },
  });

  rawStores.set(proxy, store);

  return proxy;
};

bindSaveLanes({
  failures: takeSaveFailures,
  isPending: isPendingVersion,
  savedId: savedVersionId,
  settled: savesSettled,
});

export {
  PENDING_VERSION,
  isPendingVersion,
  saveLater,
  savedVersionId,
  savesSettled,
  takeSaveFailures,
  unqueuedStore,
  withSaveQueue,
};

export type { SaveDeps };
