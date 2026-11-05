import type { Direction, Project } from "@design-studio/contracts";
import { Effect } from "effect";

import { attemptKnown } from "../platform/attempt/index.js";
import type { KnownFailure, Refine } from "../platform/attempt/index.js";
import { requireBound } from "../platform/runtime-slot/index.js";
import { directEditRuntimeOf } from "./direct-edit-core.js";
import type { DirectEditRuntime } from "./direct-edit-core.js";

interface DirectionIds {
  readonly directionId: string;
  readonly projectId: string;
}

interface DirectionRun {
  readonly direction: Direction;
  readonly project: Project;
  readonly runtime: DirectEditRuntime;
}

type DirectionTask<Value> = (run: DirectionRun) => Promise<Value>;

const inspectDirection = async <Value>(
  runtime: DirectEditRuntime,
  ids: DirectionIds,
  task: DirectionTask<Value>
): Promise<Value> => {
  const { direction, project } = await runtime.loadDirection(
    ids.projectId,
    ids.directionId
  );

  return task({ direction, project, runtime });
};

const applyDirection = <Value>(
  runtime: DirectEditRuntime,
  ids: DirectionIds,
  task: DirectionTask<Value>
): Promise<Value> =>
  runtime.withDirection(ids.projectId, ids.directionId, (project, direction) =>
    task({ direction, project, runtime })
  );

const runDirectionRead = <Value, Extra = never>(
  ids: DirectionIds,
  task: DirectionTask<Value>,
  refine: Refine<Extra>
): Effect.Effect<Value, Extra | KnownFailure> =>
  Effect.gen(function* withRuntime() {
    const runtime = yield* requireBound("DirectEdit", directEditRuntimeOf());

    return yield* attemptKnown(
      () => inspectDirection(runtime, ids, task),
      refine
    );
  });

const runDirectionWrite = <Value, Extra = never>(
  ids: DirectionIds,
  task: DirectionTask<Value>,
  refine: Refine<Extra>
): Effect.Effect<Value, Extra | KnownFailure> =>
  Effect.gen(function* withRuntime() {
    const runtime = yield* requireBound("DirectEdit", directEditRuntimeOf());

    return yield* attemptKnown(
      () => applyDirection(runtime, ids, task),
      refine
    );
  });

export { runDirectionRead, runDirectionWrite };

export type { DirectionIds, DirectionRun };
