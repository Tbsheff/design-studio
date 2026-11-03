import { Effect } from "effect";

import {
  CONFLICT_CODES,
  NOT_FOUND_CODES,
} from "../../shared/actions/_core/errors/direct-edit-code.js";
import { DirectEditError as WireDirectEditError } from "../../shared/actions/_core/errors/direct-edit-error.js";
import { DirectEditConflict } from "../../shared/actions/direct-edit/errors/direct-edit-conflict.js";
import { DirectEditNotFound } from "../../shared/actions/direct-edit/errors/direct-edit-not-found.js";
import type { Direction, Project } from "../../shared/contracts.js";
import { attemptKnown } from "../platform/attempt/index.js";
import type { KnownFailure } from "../platform/attempt/index.js";
import { loadConfig } from "../platform/config/index.js";
import {
  makeRuntimeSlot,
  requireBound,
} from "../platform/runtime-slot/index.js";
import type { PreviewService } from "../types.js";
import type { DirectEditDeps } from "./commit/edit-types.js";
import { DirectEditError as EngineDirectEditError } from "./engine/errors.js";

interface DirectEditRuntime {
  readonly editDeps: DirectEditDeps;
  readonly listWorkTree: (workTree: string) => Promise<string[]>;
  readonly loadDirection: (
    projectId: string,
    directionId: string
  ) => Promise<{ direction: Direction; project: Project }>;
  readonly preview: PreviewService;
  readonly watchTokenSources: (project: Project) => void;
  readonly withDirection: <Value>(
    projectId: string,
    directionId: string,
    task: (project: Project, direction: Direction) => Promise<Value>
  ) => Promise<Value>;
}

type DirectEditFailure =
  | DirectEditConflict
  | DirectEditNotFound
  | KnownFailure
  | WireDirectEditError;

const runtimes = makeRuntimeSlot<DirectEditRuntime>("DirectEdit");

const bindDirectEditRuntime = (
  dataDir: string,
  runtime: DirectEditRuntime
): void => {
  runtimes.bindAt(dataDir, runtime);
};

const toDirectEditFailure = (
  cause: unknown
): DirectEditConflict | DirectEditNotFound | WireDirectEditError | null => {
  if (!(cause instanceof EngineDirectEditError)) {
    return null;
  }

  const fields = { code: cause.code, data: {}, message: cause.message };

  if (CONFLICT_CODES.includes(cause.code)) {
    return new DirectEditConflict(fields);
  }

  if (NOT_FOUND_CODES.includes(cause.code)) {
    return new DirectEditNotFound(fields);
  }

  return new WireDirectEditError(fields);
};

const attemptDirectEdit = <Value>(
  task: (runtime: DirectEditRuntime) => Promise<Value>
): Effect.Effect<Value, DirectEditFailure> =>
  Effect.gen(function* withRuntime() {
    const runtime = yield* requireBound(
      "DirectEdit",
      runtimes.peekAt(loadConfig().dataDir)
    );

    return yield* attemptKnown(() => task(runtime), toDirectEditFailure);
  });

export { attemptDirectEdit, bindDirectEditRuntime, toDirectEditFailure };

export type { DirectEditFailure, DirectEditRuntime };
