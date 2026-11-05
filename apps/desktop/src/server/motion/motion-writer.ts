import { Context, Effect, Layer } from "effect";

import type { KnownFailure } from "../platform/attempt/index.js";
import { runMotionSet } from "./motion-run.js";
import type { MotionChange, SetMotionCommand } from "./motion-run.js";

interface MotionWriterApi {
  readonly set: (
    command: SetMotionCommand
  ) => Effect.Effect<MotionChange, KnownFailure>;
}

class MotionWriter extends Context.Service<MotionWriter, MotionWriterApi>()(
  "design-studio/motion/MotionWriter"
) {
  declare public readonly access: "write";

  public static readonly layer = Layer.succeed(
    MotionWriter,
    MotionWriter.of({
      set: Effect.fn("MotionWriter.set")(function* run(
        command: SetMotionCommand
      ) {
        return yield* runMotionSet(command);
      }),
    })
  );
}

export { MotionWriter };

export type { MotionWriterApi };
