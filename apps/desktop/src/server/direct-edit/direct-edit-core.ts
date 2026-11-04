import { Effect } from "effect";

import { DirectEditConflict } from "../../shared/actions/direct-edit/errors/direct-edit-conflict.js";
import { DirectEditFailed } from "../../shared/actions/direct-edit/errors/direct-edit-failed.js";
import { DirectEditNotFound } from "../../shared/actions/direct-edit/errors/direct-edit-not-found.js";
import {
  CONFLICT_CODES,
  NOT_FOUND_CODES,
} from "../../shared/actions/direct-edit/schema.js";
import type { Direction, Project, Version } from "../../shared/actions/_core/contracts.js";
import type { DesignRule } from "../../shared/actions/_core/design-rules.js";
import type { CanvasService } from "../canvas/index.js";
import type {
  ComponentPreviews,
  ComponentService,
} from "../components/index.js";
import { attemptKnown } from "../platform/attempt/index.js";
import type { KnownFailure } from "../platform/attempt/index.js";
import { loadConfig } from "../platform/config/index.js";
import {
  makeRuntimeSlot,
  requireBound,
} from "../platform/runtime-slot/index.js";
import type { PreviewService } from "../types.js";
import type { DirectEditDeps } from "./commit/edit-types.js";
import { DirectEditError } from "./engine/errors.js";

interface DirectEditRuntime {
  readonly canvas: CanvasService;
  readonly commitDesignMd: (
    project: Project,
    direction: Direction
  ) => Promise<Version | null>;
  readonly components: ComponentService;
  readonly editDeps: DirectEditDeps;
  readonly listWorkTree: (workTree: string) => Promise<string[]>;
  readonly loadDirection: (
    projectId: string,
    directionId: string
  ) => Promise<{ direction: Direction; project: Project }>;
  readonly preview: PreviewService;
  readonly previews: ComponentPreviews;
  readonly projectDir: (projectId: string) => string;
  readonly rulesFor: (
    project: Project,
    direction: Direction
  ) => Promise<DesignRule[]>;
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
  | DirectEditFailed;

const runtimes = makeRuntimeSlot<DirectEditRuntime>("DirectEdit");

const bindDirectEditRuntime = (
  dataDir: string,
  runtime: DirectEditRuntime
): void => {
  runtimes.bindAt(dataDir, runtime);
};

const toDirectEditFailure = (
  cause: unknown
): DirectEditConflict | DirectEditNotFound | DirectEditFailed | null => {
  if (!(cause instanceof DirectEditError)) {
    return null;
  }

  const fields = { code: cause.code, data: {}, message: cause.message };

  if (CONFLICT_CODES.includes(cause.code)) {
    return new DirectEditConflict(fields);
  }

  if (NOT_FOUND_CODES.includes(cause.code)) {
    return new DirectEditNotFound(fields);
  }

  return new DirectEditFailed(fields);
};

const directEditRuntimeOf = (): DirectEditRuntime | null =>
  runtimes.peekAt(loadConfig().dataDir);

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

export {
  attemptDirectEdit,
  bindDirectEditRuntime,
  directEditRuntimeOf,
  toDirectEditFailure,
};

export type { DirectEditFailure, DirectEditRuntime };
