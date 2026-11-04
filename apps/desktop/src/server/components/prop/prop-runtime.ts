import { Effect } from "effect";

import { attemptKnown, directEditRuntimeOf, requireBound } from "./deps.js";
import type { DirectEditRuntime, KnownFailure } from "./deps.js";
import type { PropScope, TargetCommand } from "./prop-target.js";

interface PropRun {
  readonly runtime: DirectEditRuntime;
  readonly scope: PropScope;
}

const runPropTask = <Value>(
  command: TargetCommand,
  task: (run: PropRun) => Promise<Value>
): Effect.Effect<Value, KnownFailure> =>
  Effect.gen(function* withRuntime() {
    const runtime = yield* requireBound("DirectEdit", directEditRuntimeOf());

    return yield* attemptKnown(() =>
      runtime.withDirection(
        command.projectId,
        command.directionId,
        (project, direction) =>
          task({
            runtime,
            scope: { direction, project, workTree: direction.workTree },
          })
      )
    );
  });

export { runPropTask };

export type { PropRun };
