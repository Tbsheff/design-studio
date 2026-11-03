import { Effect } from "effect";
import type { Cause } from "effect";

import { BadRequest } from "../../shared/actions/_core/errors/bad-request.js";
import { Conflict } from "../../shared/actions/_core/errors/conflict.js";
import { NotFound } from "../../shared/actions/_core/errors/not-found.js";
import type { Direction, Project, Version } from "../../shared/contracts.js";
import { DirectEditError } from "../direct-edit/engine/errors.js";
import type { EditHistory } from "../direct-edit/history.js";
import type { DirectEditDeps } from "../direct-edit/index.js";
import { loadConfig } from "../platform/config/index.js";
import type { VersionStore } from "../types.js";
import { ConflictError, NotFoundError } from "./errors.js";
import type { StudioProjectStore } from "./projects.js";
import type { VersionNames } from "./version-names.js";

type DirectionTask<Value> = (
  project: Project,
  direction: Direction
) => Promise<Value>;

interface VersionWriteRuntime {
  readonly editDeps: DirectEditDeps;
  readonly emitStatus: (
    project: Project,
    direction: Direction
  ) => Promise<void>;
  readonly history: EditHistory;
  readonly names: VersionNames;
  readonly onRemapped: (
    projectId: string,
    remapped: Record<string, { id: string; parentId: string }>
  ) => void;
  readonly onRestored: (workTree: string, relatives: string[]) => void;
  readonly projects: Pick<StudioProjectStore, "get">;
  readonly recordVersion: (
    project: Project,
    direction: Direction,
    version: Version,
    reason?: "restore" | "undo"
  ) => Promise<Direction>;
  readonly syncPackId: (
    project: Project,
    direction: Direction
  ) => Promise<void>;
  readonly versions: VersionStore;
  readonly withDirection: <Value>(
    projectId: string,
    directionId: string,
    task: DirectionTask<Value>
  ) => Promise<Value>;
}

type VersionWriteError = BadRequest | Conflict | NotFound;

const STATUS_NOT_FOUND = 404;

const STATUS_CONFLICT = 409;

const NOT_READY =
  "Version writes are not ready in this Design Studio process. Restart Design Studio.";

const REQUIRED_KEYS = [
  "editDeps",
  "emitStatus",
  "history",
  "names",
  "onRemapped",
  "onRestored",
  "projects",
  "recordVersion",
  "syncPackId",
  "versions",
  "withDirection",
] as const;

const runtimes = new Map<string, Partial<VersionWriteRuntime>>();

const bindVersionWriteRuntime = (part: Partial<VersionWriteRuntime>): void => {
  const { dataDir } = loadConfig();
  runtimes.set(dataDir, { ...runtimes.get(dataDir), ...part });
};

const isReady = (
  runtime: Partial<VersionWriteRuntime> | null
): runtime is VersionWriteRuntime =>
  runtime !== null && REQUIRED_KEYS.every((key) => key in runtime);

const fromDirectEdit = (error: DirectEditError): VersionWriteError => {
  if (error.status === STATUS_NOT_FOUND) {
    return new NotFound({ message: error.message });
  }

  if (error.status === STATUS_CONFLICT) {
    return new Conflict({ message: error.message });
  }

  return new BadRequest({ message: error.message });
};

const toVersionWriteError = (error: Cause.UnknownError): VersionWriteError => {
  const { cause } = error;

  if (cause instanceof DirectEditError) {
    return fromDirectEdit(cause);
  }

  if (cause instanceof NotFoundError) {
    return new NotFound({ message: cause.message });
  }

  if (cause instanceof ConflictError) {
    return new Conflict({ message: cause.message });
  }

  if (cause instanceof Error) {
    return new BadRequest({ message: cause.message });
  }

  return new BadRequest({ message: String(cause) });
};

const attemptVersionWrite = <Value>(
  task: (runtime: VersionWriteRuntime) => Promise<Value>
): Effect.Effect<Value, VersionWriteError> =>
  Effect.gen(function* withRuntime() {
    const runtime = runtimes.get(loadConfig().dataDir) ?? null;

    if (!isReady(runtime)) {
      return yield* new BadRequest({ message: NOT_READY });
    }

    return yield* Effect.tryPromise(() => task(runtime)).pipe(
      Effect.mapError((failure) => toVersionWriteError(failure))
    );
  });

export { attemptVersionWrite, bindVersionWriteRuntime };

export type { DirectionTask, VersionWriteError, VersionWriteRuntime };
