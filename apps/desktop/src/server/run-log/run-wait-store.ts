import { Context, Duration, Effect, Layer } from "effect";

import { readRunLogRuntime } from "./run-log-runtime.js";

interface RunWaitStoreApi {
  readonly wait: (runId: string, waitSeconds: number) => Effect.Effect<void>;
}

const WAIT_MAX_SECONDS = 120;

class RunWaitStore extends Context.Service<RunWaitStore, RunWaitStoreApi>()(
  "design-studio/run-log/RunWaitStore"
) {
  declare public readonly access: "read";

  public static readonly layer = Layer.succeed(
    RunWaitStore,
    RunWaitStore.of({
      wait: Effect.fn("RunWaitStore.wait")(function* run(
        runId: string,
        waitSeconds: number
      ) {
        const seconds = Math.min(WAIT_MAX_SECONDS, Math.max(0, waitSeconds));
        const runtime = yield* readRunLogRuntime;
        const handle = runtime.runner.get(runId) ?? null;

        if (seconds === 0 || handle === null) {
          return;
        }

        yield* Effect.tryPromise({
          catch: () => null,
          try: () => handle.done,
        }).pipe(Effect.ignore, Effect.timeoutOption(Duration.seconds(seconds)));
      }),
    })
  );
}

export { RunWaitStore };

export type { RunWaitStoreApi };
