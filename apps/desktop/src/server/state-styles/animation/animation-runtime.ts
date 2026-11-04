import { Effect } from "effect";

import type { AnimationScope, TargetCommand } from "./animation-scope.js";
import { attemptKnown, directEditRuntimeOf, requireBound } from "./deps.js";
import type { DirectEditRuntime, KnownFailure, Refine } from "./deps.js";

interface AnimationRun {
  readonly runtime: DirectEditRuntime;
  readonly scope: AnimationScope;
}

const runAnimationTask = <Value, Extra = never>(
  command: TargetCommand,
  task: (run: AnimationRun) => Promise<Value>,
  refine: Refine<Extra> | null
): Effect.Effect<Value, Extra | KnownFailure> =>
  Effect.gen(function* withRuntime() {
    const runtime = yield* requireBound("DirectEdit", directEditRuntimeOf());

    const run = (): Promise<Value> =>
      runtime.withDirection(
        command.projectId,
        command.directionId,
        (project, direction) =>
          task({
            runtime,
            scope: { direction, project, workTree: direction.workTree },
          })
      );

    if (refine === null) {
      return yield* attemptKnown(run);
    }

    return yield* attemptKnown(run, refine);
  });

export { runAnimationTask };

export type { AnimationRun };
