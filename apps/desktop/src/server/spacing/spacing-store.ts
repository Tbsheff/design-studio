import { Context, Effect, Layer } from "effect";

import type { KnownFailure } from "../platform/attempt/index.js";
import { runSpacingGet } from "./spacing-run.js";
import type { GetSpacingCommand } from "./spacing-run.js";
import type { SpacingBox } from "./spacing-scale.js";

interface SpacingStoreApi {
  readonly get: (
    command: GetSpacingCommand
  ) => Effect.Effect<SpacingBox, KnownFailure>;
}

class SpacingStore extends Context.Service<SpacingStore, SpacingStoreApi>()(
  "design-studio/spacing/SpacingStore"
) {
  declare public readonly access: "read";

  public static readonly layer = Layer.succeed(
    SpacingStore,
    SpacingStore.of({
      get: Effect.fn("SpacingStore.get")(function* run(
        command: GetSpacingCommand
      ) {
        return yield* runSpacingGet(command);
      }),
    })
  );
}

export { SpacingStore };

export type { SpacingStoreApi };
