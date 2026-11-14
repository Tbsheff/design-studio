import { Context, Effect, Layer } from "effect";

import type { KnownFailure } from "../../platform/attempt/index.js";
import { runDividerSet } from "./divider-run.js";
import type { DividerChange, SetDividerCommand } from "./divider-run.js";

interface DividerWriterApi {
  readonly set: (
    command: SetDividerCommand
  ) => Effect.Effect<DividerChange, KnownFailure>;
}

class DividerWriter extends Context.Service<DividerWriter, DividerWriterApi>()(
  "design-studio/style-scope/DividerWriter"
) {
  declare public readonly access: "write";

  public static readonly layer = Layer.succeed(
    DividerWriter,
    DividerWriter.of({
      set: Effect.fn("DividerWriter.set")(function* run(
        command: SetDividerCommand
      ) {
        return yield* runDividerSet(command);
      }),
    })
  );
}

export { DividerWriter };

export type { DividerWriterApi };
