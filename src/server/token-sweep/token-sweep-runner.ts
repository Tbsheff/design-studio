import { Context, Effect, Layer } from "effect";

import type { KnownFailure } from "./deps.js";
import { sweepTokens } from "./sweep-tokens.js";
import type { SweepCommand, SweepResult } from "./sweep-tokens.js";
import { attemptSweep } from "./token-sweep-runtime.js";

interface TokenSweepRunnerApi {
  readonly apply: (
    command: SweepCommand
  ) => Effect.Effect<SweepResult, KnownFailure>;
}

class TokenSweepRunner extends Context.Service<
  TokenSweepRunner,
  TokenSweepRunnerApi
>()("design-studio/token-sweep/TokenSweepRunner") {
  declare public readonly access: "write";

  public static readonly layer = Layer.succeed(
    TokenSweepRunner,
    TokenSweepRunner.of({
      apply: Effect.fn("TokenSweepRunner.apply")(function* run(
        command: SweepCommand
      ) {
        return yield* attemptSweep((runtime) => sweepTokens(runtime, command));
      }),
    })
  );
}

export { TokenSweepRunner };

export type { TokenSweepRunnerApi };
