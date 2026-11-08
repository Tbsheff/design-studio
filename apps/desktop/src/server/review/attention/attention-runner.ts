import type { Unavailable } from "@design-studio/actions/_core/errors/unavailable";
import { Context, Effect, Layer } from "effect";

import type { KnownFailure } from "../../platform/attempt/index.js";
import { viewportRuntime } from "../../viewport/index.js";
import { runAttention } from "./attention-run.js";
import type { AttentionResult, RunAttentionCommand } from "./attention-run.js";

interface AttentionRunnerApi {
  readonly run: (
    command: RunAttentionCommand
  ) => Effect.Effect<AttentionResult, KnownFailure | Unavailable>;
}

class AttentionRunner extends Context.Service<
  AttentionRunner,
  AttentionRunnerApi
>()("design-studio/review/AttentionRunner") {
  declare public readonly access: "write";

  public static readonly layer = Layer.succeed(
    AttentionRunner,
    AttentionRunner.of({
      run: Effect.fn("AttentionRunner.run")(function* run(
        command: RunAttentionCommand
      ) {
        const runtime = yield* viewportRuntime;

        return yield* runAttention(runtime, command);
      }),
    })
  );
}

export { AttentionRunner };

export type { AttentionRunnerApi };
