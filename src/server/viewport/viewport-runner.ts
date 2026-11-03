import { Context, Effect, Layer } from "effect";

import type { KnownFailure } from "./deps.js";
import { inspectMatrix } from "./inspect-matrix.js";
import type { InspectCommand, MatrixInspected } from "./inspect-matrix.js";
import { attemptViewport } from "./viewport-runtime.js";

interface ViewportRunnerApi {
  readonly inspect: (
    command: InspectCommand
  ) => Effect.Effect<MatrixInspected, KnownFailure>;
}

class ViewportRunner extends Context.Service<
  ViewportRunner,
  ViewportRunnerApi
>()("design-studio/viewport/ViewportRunner") {
  declare public readonly access: "read";

  public static readonly layer = Layer.succeed(
    ViewportRunner,
    ViewportRunner.of({
      inspect: Effect.fn("ViewportRunner.inspect")(function* run(
        command: InspectCommand
      ) {
        return yield* attemptViewport((runtime) =>
          inspectMatrix(runtime, command)
        );
      }),
    })
  );
}

export { ViewportRunner };

export type { ViewportRunnerApi };
