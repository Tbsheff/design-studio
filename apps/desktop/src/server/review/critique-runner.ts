import { Context, Effect, Layer } from "effect";

import type { KnownFailure } from "../platform/attempt/index.js";
import { viewportRuntime } from "../viewport/index.js";
import type { Critique, RunCommand } from "./critique-frame.js";
import { critiqueFrame } from "./critique-frame.js";

interface CritiqueRunnerApi {
  readonly run: (command: RunCommand) => Effect.Effect<Critique, KnownFailure>;
}

class CritiqueRunner extends Context.Service<
  CritiqueRunner,
  CritiqueRunnerApi
>()("design-studio/review/CritiqueRunner") {
  declare public readonly access: "write";

  public static readonly layer = Layer.succeed(
    CritiqueRunner,
    CritiqueRunner.of({
      run: Effect.fn("CritiqueRunner.run")(function* run(command: RunCommand) {
        const runtime = yield* viewportRuntime;

        return yield* critiqueFrame(runtime, command);
      }),
    })
  );
}

export { CritiqueRunner };

export type { CritiqueRunnerApi };
