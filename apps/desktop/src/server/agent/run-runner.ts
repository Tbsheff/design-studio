import { Context, Effect, Fiber, Layer } from "effect";

interface RunRunnerApi {
  readonly interrupt: (runId: string) => Effect.Effect<boolean>;
  readonly launch: (
    runId: string,
    done: Promise<unknown>,
    abort: () => void
  ) => Effect.Effect<void>;
}

interface RunFibers {
  readonly interrupt: (runId: string) => void;
  readonly launch: (
    runId: string,
    done: Promise<unknown>,
    abort: () => void
  ) => void;
}

class RunRunner extends Context.Service<RunRunner, RunRunnerApi>()(
  "design-studio/agent/RunRunner"
) {
  declare public readonly access: "write";

  public static readonly layer = Layer.sync(RunRunner, () => {
    const fibers = new Map<string, Fiber.Fiber<void>>();

    return RunRunner.of({
      interrupt: Effect.fn("RunRunner.interrupt")(function* run(runId: string) {
        const fiber = fibers.get(runId);

        if (!fiber) {
          return false;
        }

        fibers.delete(runId);
        yield* Fiber.interrupt(fiber);

        return true;
      }),
      launch: Effect.fn("RunRunner.launch")(function* run(
        runId: string,
        done: Promise<unknown>,
        abort: () => void
      ) {
        const body = Effect.tryPromise(() => done).pipe(
          Effect.ignore,
          Effect.onInterrupt(() => Effect.sync(abort)),
          Effect.ensuring(
            Effect.sync(() => {
              fibers.delete(runId);
            })
          )
        );

        fibers.set(runId, yield* Effect.forkDetach(body));
      }),
    });
  });
}

export { RunRunner };

export type { RunFibers, RunRunnerApi };
