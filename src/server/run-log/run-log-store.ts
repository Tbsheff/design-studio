import { Context, Effect, Layer } from "effect";

import type { KnownFailure } from "../platform/attempt/index.js";
import { listRuns, readRun, readRunContext } from "./run-log-reads.js";
import type { RunListInput } from "./run-log-reads.js";
import { attemptRunLog } from "./run-log-runtime.js";

interface RunLogApi {
  readonly context: (
    projectId: string,
    directionId: string
  ) => Effect.Effect<Awaited<ReturnType<typeof readRunContext>>, KnownFailure>;
  readonly get: (
    runId: string
  ) => Effect.Effect<Awaited<ReturnType<typeof readRun>>, KnownFailure>;
  readonly list: (
    projectId: string,
    input: RunListInput
  ) => Effect.Effect<Awaited<ReturnType<typeof listRuns>>, KnownFailure>;
}

class RunLogStore extends Context.Service<RunLogStore, RunLogApi>()(
  "design-studio/run-log/RunLogStore"
) {
  declare public readonly access: "read";

  public static readonly layer = Layer.succeed(
    RunLogStore,
    RunLogStore.of({
      context: Effect.fn("RunLogStore.context")(function* run(
        projectId: string,
        directionId: string
      ) {
        return yield* attemptRunLog((runtime) =>
          readRunContext(runtime, projectId, directionId)
        );
      }),
      get: Effect.fn("RunLogStore.get")(function* run(runId: string) {
        return yield* attemptRunLog((runtime) => readRun(runtime, runId));
      }),
      list: Effect.fn("RunLogStore.list")(function* run(
        projectId: string,
        input: RunListInput
      ) {
        return yield* attemptRunLog((runtime) =>
          listRuns(runtime, projectId, input)
        );
      }),
    })
  );
}

export { RunLogStore };
