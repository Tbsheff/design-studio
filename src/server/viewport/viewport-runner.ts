import { Context, Effect, Layer } from "effect";

import type { KnownFailure } from "./deps.js";
import { inspectMatrix } from "./inspect-matrix.js";
import type { InspectCommand, MatrixInspected } from "./inspect-matrix.js";
import { viewportRuntime } from "./viewport-runtime.js";

interface ViewportRunnerApi {
  readonly run: (
    command: InspectCommand
  ) => Effect.Effect<MatrixInspected, KnownFailure>;
}

class ViewportRunner extends Context.Service<
  ViewportRunner,
  ViewportRunnerApi
>()("design-studio/viewport/ViewportRunner") {
  declare public readonly access: "write";

  public static readonly layer = Layer.succeed(
    ViewportRunner,
    ViewportRunner.of({
      run: Effect.fn("ViewportRunner.run")(function* run(
        command: InspectCommand
      ) {
        const runtime = yield* viewportRuntime;

        return yield* inspectMatrix(runtime, command);
      }),
    })
  );
}

export { ViewportRunner };

export type { ViewportRunnerApi };
