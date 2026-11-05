import { Context, Effect, Layer } from "effect";

import type { KnownFailure } from "../platform/attempt/index.js";
import { runFillSet } from "./fill-run.js";
import type { FillChange, SetFillCommand } from "./fill-run.js";

interface FillWriterApi {
  readonly set: (
    command: SetFillCommand
  ) => Effect.Effect<FillChange, KnownFailure>;
}

class FillWriter extends Context.Service<FillWriter, FillWriterApi>()(
  "design-studio/fill/FillWriter"
) {
  declare public readonly access: "write";

  public static readonly layer = Layer.succeed(
    FillWriter,
    FillWriter.of({
      set: Effect.fn("FillWriter.set")(function* run(command: SetFillCommand) {
        return yield* runFillSet(command);
      }),
    })
  );
}

export { FillWriter };

export type { FillWriterApi };
