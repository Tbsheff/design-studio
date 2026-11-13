import { BadRequest } from "@design-studio/actions/_core/errors/bad-request";
import { Conflict } from "@design-studio/actions/_core/errors/conflict";
import { Forbidden } from "@design-studio/actions/_core/errors/forbidden";
import { NotFound } from "@design-studio/actions/_core/errors/not-found";
import type { Direction, Project, Version } from "@design-studio/contracts";
import { Effect } from "effect";

import type { VersionStore } from "../../shared/server-ports.js";
import type { EditHistory, DirectEditDeps } from "../events/index.js";
import { DirectEditError } from "../events/index.js";
import { attemptKnown } from "../platform/attempt/index.js";
import { ForbiddenError } from "../platform/errors/index.js";
import {
  makeRuntimeSlot,
  requireBound,
} from "../platform/runtime-slot/index.js";
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

type VersionWriteError = BadRequest | Conflict | Forbidden | NotFound;

const STATUS_NOT_FOUND = 404;

const STATUS_CONFLICT = 409;

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

const slot = makeRuntimeSlot<Partial<VersionWriteRuntime>>("Version write");

const bindVersionWriteRuntime = (part: Partial<VersionWriteRuntime>): void => {
  slot.bind({ ...slot.peek(), ...part });
};

const isReady = (
  runtime: Partial<VersionWriteRuntime> | null
): runtime is VersionWriteRuntime =>
  runtime !== null && REQUIRED_KEYS.every((key) => key in runtime);

const readyOrNull = (
  runtime: Partial<VersionWriteRuntime> | null
): VersionWriteRuntime | null => {
  if (isReady(runtime)) {
    return runtime;
  }

  return null;
};

const fromDirectEdit = (error: DirectEditError): VersionWriteError => {
  if (error.status === STATUS_NOT_FOUND) {
    return new NotFound({ message: error.message });
  }

  if (error.status === STATUS_CONFLICT) {
    return new Conflict({ message: error.message });
  }

  return new BadRequest({ message: error.message });
};

const toWriteFailure = (cause: unknown): VersionWriteError | null => {
  if (cause instanceof ForbiddenError) {
    return new Forbidden({ message: cause.message, perm: "studio.write" });
  }

  if (cause instanceof DirectEditError) {
    return fromDirectEdit(cause);
  }

  return null;
};

const attemptVersionWrite = <Value>(
  task: (runtime: VersionWriteRuntime) => Promise<Value>
): Effect.Effect<Value, VersionWriteError> =>
  Effect.gen(function* withRuntime() {
    const found = slot.peek();
    const runtime = yield* requireBound("Version write", readyOrNull(found));

    return yield* attemptKnown(() => task(runtime), toWriteFailure);
  });

export { attemptVersionWrite, bindVersionWriteRuntime };

export type { DirectionTask, VersionWriteError, VersionWriteRuntime };
