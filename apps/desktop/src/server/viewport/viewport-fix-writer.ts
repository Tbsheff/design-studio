import { Context, Effect, Layer } from "effect";

import type { KnownFailure } from "./deps.js";
import { runViewportFix } from "./viewport-fix-run.js";
import type { FixCommand, FixResult } from "./viewport-fix-types.js";
import { viewportRuntime } from "./viewport-runtime.js";

interface ViewportFixWriterApi {
  readonly apply: (
    command: FixCommand
  ) => Effect.Effect<FixResult, KnownFailure>;
}

class ViewportFixWriter extends Context.Service<
  ViewportFixWriter,
  ViewportFixWriterApi
>()("design-studio/viewport/ViewportFixWriter") {
  declare public readonly access: "write";

  public static readonly layer = Layer.succeed(
    ViewportFixWriter,
    ViewportFixWriter.of({
      apply: Effect.fn("ViewportFixWriter.apply")(function* run(
        command: FixCommand
      ) {
        const runtime = yield* viewportRuntime;

        return yield* runViewportFix(runtime, command);
      }),
    })
  );
}

export { ViewportFixWriter };

export type { ViewportFixWriterApi };
