import { Context, Effect, Layer } from "effect";

import { attemptCanvas } from "../canvas-runtime.js";
import type { CanvasFailure } from "../canvas-runtime.js";
import { moveCanvasFrames } from "./frame-tidy-ops.js";
import type { FramesTidied, FrameTidyQuery } from "./frame-tidy-ops.js";

interface FrameTidyWriterApi {
  readonly moveFrames: (
    query: FrameTidyQuery
  ) => Effect.Effect<FramesTidied, CanvasFailure>;
}

class FrameTidyWriter extends Context.Service<
  FrameTidyWriter,
  FrameTidyWriterApi
>()("design-studio/canvas/FrameTidyWriter") {
  declare public readonly access: "write";

  public static readonly layer = Layer.succeed(
    FrameTidyWriter,
    FrameTidyWriter.of({
      moveFrames: Effect.fn("FrameTidyWriter.moveFrames")(function* run(
        query: FrameTidyQuery
      ) {
        return yield* attemptCanvas((runtime) =>
          moveCanvasFrames(runtime, query)
        );
      }),
    })
  );
}

export { FrameTidyWriter };

export type { FrameTidyWriterApi };
