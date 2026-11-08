import { Context, Effect, Layer } from "effect";

import type { KnownFailure } from "../../platform/attempt/index.js";
import { runSpacingSet } from "./spacing-run.js";
import type { SetSpacingCommand, SpacingChange } from "./spacing-run.js";

interface SpacingWriterApi {
  readonly set: (
    command: SetSpacingCommand
  ) => Effect.Effect<SpacingChange, KnownFailure>;
}

class SpacingWriter extends Context.Service<SpacingWriter, SpacingWriterApi>()(
  "design-studio/share/SpacingWriter"
) {
  declare public readonly access: "write";

  public static readonly layer = Layer.succeed(
    SpacingWriter,
    SpacingWriter.of({
      set: Effect.fn("SpacingWriter.set")(function* run(
        command: SetSpacingCommand
      ) {
        return yield* runSpacingSet(command);
      }),
    })
  );
}

export { SpacingWriter };

export type { SpacingWriterApi };
