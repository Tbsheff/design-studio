import { Context, Effect, Layer } from "effect";

import type { KnownFailure } from "../../platform/attempt/index.js";
import { runStackingSet } from "./stacking-run.js";
import type { SetStackingCommand, StackingChange } from "./stacking-run.js";

interface StackingWriterApi {
  readonly set: (
    command: SetStackingCommand
  ) => Effect.Effect<StackingChange, KnownFailure>;
}

class StackingWriter extends Context.Service<
  StackingWriter,
  StackingWriterApi
>()("design-studio/share/StackingWriter") {
  declare public readonly access: "write";

  public static readonly layer = Layer.succeed(
    StackingWriter,
    StackingWriter.of({
      set: Effect.fn("StackingWriter.set")(function* run(
        command: SetStackingCommand
      ) {
        return yield* runStackingSet(command);
      }),
    })
  );
}

export { StackingWriter };

export type { StackingWriterApi };
