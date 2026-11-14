import { Context, Effect, Layer } from "effect";

import { attemptCanvas } from "../canvas-runtime.js";
import type { CanvasFailure } from "../canvas-runtime.js";
import { setCanvasFrameHeights } from "./frame-fit-ops.js";
import type { FrameFitQuery, FramesFitted } from "./frame-fit-ops.js";

interface FrameFitWriterApi {
  readonly setFrameHeights: (
    query: FrameFitQuery
  ) => Effect.Effect<FramesFitted, CanvasFailure>;
}

class FrameFitWriter extends Context.Service<
  FrameFitWriter,
  FrameFitWriterApi
>()("design-studio/canvas/FrameFitWriter") {
  declare public readonly access: "write";

  public static readonly layer = Layer.succeed(
    FrameFitWriter,
    FrameFitWriter.of({
      setFrameHeights: Effect.fn("FrameFitWriter.setFrameHeights")(
        function* run(query: FrameFitQuery) {
          return yield* attemptCanvas((runtime) =>
            setCanvasFrameHeights(runtime, query)
          );
        }
      ),
    })
  );
}

export { FrameFitWriter };

export type { FrameFitWriterApi };
