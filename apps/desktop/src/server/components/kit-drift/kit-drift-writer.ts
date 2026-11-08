import { Context, Effect, Layer } from "effect";

import type { KnownFailure } from "./deps.js";
import { runKitDriftApplyEffect } from "./kit-drift-run.js";
import type { ApplyKitDriftCommand, KitDriftApplied } from "./kit-drift-run.js";

interface KitDriftWriterApi {
  readonly apply: (
    command: ApplyKitDriftCommand
  ) => Effect.Effect<KitDriftApplied, KnownFailure>;
}

class KitDriftWriter extends Context.Service<
  KitDriftWriter,
  KitDriftWriterApi
>()("design-studio/components/KitDriftWriter") {
  declare public readonly access: "write";

  public static readonly layer = Layer.succeed(
    KitDriftWriter,
    KitDriftWriter.of({
      apply: Effect.fn("KitDriftWriter.apply")(function* run(
        command: ApplyKitDriftCommand
      ) {
        return yield* runKitDriftApplyEffect(command);
      }),
    })
  );
}

export { KitDriftWriter };

export type { KitDriftWriterApi };
