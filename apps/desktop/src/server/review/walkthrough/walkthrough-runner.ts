import { Context, Effect, Layer } from "effect";

import type { KnownFailure } from "../../platform/attempt/index.js";
import { viewportRuntime } from "../../viewport/index.js";
import { createWalkthrough } from "./walkthrough-run.js";
import type { RunCommand, Walkthrough } from "./walkthrough-run.js";

interface WalkthroughRunnerApi {
  readonly run: (
    command: RunCommand
  ) => Effect.Effect<Walkthrough, KnownFailure>;
}

class WalkthroughRunner extends Context.Service<
  WalkthroughRunner,
  WalkthroughRunnerApi
>()("design-studio/review/WalkthroughRunner") {
  declare public readonly access: "write";

  public static readonly layer = Layer.succeed(
    WalkthroughRunner,
    WalkthroughRunner.of({
      run: Effect.fn("WalkthroughRunner.run")(function* run(
        command: RunCommand
      ) {
        const runtime = yield* viewportRuntime;

        return yield* createWalkthrough(runtime, command);
      }),
    })
  );
}

export { WalkthroughRunner };

export type { WalkthroughRunnerApi };
