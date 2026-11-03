import { Effect } from "effect";

import { attemptKnown, makeRuntimeSlot, requireBound } from "./deps.js";
import type {
  DirectEditDeps,
  Direction,
  KnownFailure,
  Project,
} from "./deps.js";

interface TokenSweepRuntime {
  readonly editDeps: DirectEditDeps;
  readonly withDirection: <Value>(
    projectId: string,
    directionId: string,
    task: (project: Project, direction: Direction) => Promise<Value>
  ) => Promise<Value>;
}

const runtimes = makeRuntimeSlot<TokenSweepRuntime>("TokenSweep");

const bindTokenSweepRuntime = (runtime: TokenSweepRuntime): void => {
  runtimes.bind(runtime);
};

const attemptSweep = <Value>(
  task: (runtime: TokenSweepRuntime) => Promise<Value>
): Effect.Effect<Value, KnownFailure> =>
  Effect.gen(function* withRuntime() {
    const runtime = yield* requireBound("TokenSweep", runtimes.peek());

    return yield* attemptKnown(() => task(runtime));
  });

export { attemptSweep, bindTokenSweepRuntime };

export type { TokenSweepRuntime };
