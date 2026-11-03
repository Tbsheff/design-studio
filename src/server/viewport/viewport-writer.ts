import { Context, Effect, Layer } from "effect";

import { createMatrix } from "./create-matrix.js";
import type { MatrixCommand, MatrixCreated } from "./create-matrix.js";
import type { KnownFailure } from "./deps.js";
import { attemptViewport } from "./viewport-runtime.js";

interface ViewportWriterApi {
  readonly create: (
    command: MatrixCommand
  ) => Effect.Effect<MatrixCreated, KnownFailure>;
}

class ViewportWriter extends Context.Service<
  ViewportWriter,
  ViewportWriterApi
>()("design-studio/viewport/ViewportWriter") {
  declare public readonly access: "write";

  public static readonly layer = Layer.succeed(
    ViewportWriter,
    ViewportWriter.of({
      create: Effect.fn("ViewportWriter.create")(function* run(
        command: MatrixCommand
      ) {
        return yield* attemptViewport((runtime) =>
          createMatrix(runtime, command)
        );
      }),
    })
  );
}

export { ViewportWriter };

export type { ViewportWriterApi };
