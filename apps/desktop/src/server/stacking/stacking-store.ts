import { Context, Effect, Layer } from "effect";

import type { KnownFailure } from "../platform/attempt/index.js";
import type { StackingInfo } from "./deps.js";
import { runStackingGet } from "./stacking-run.js";
import type { GetStackingCommand } from "./stacking-run.js";

interface StackingStoreApi {
  readonly get: (
    command: GetStackingCommand
  ) => Effect.Effect<StackingInfo, KnownFailure>;
}

class StackingStore extends Context.Service<StackingStore, StackingStoreApi>()(
  "design-studio/stacking/StackingStore"
) {
  declare public readonly access: "read";

  public static readonly layer = Layer.succeed(
    StackingStore,
    StackingStore.of({
      get: Effect.fn("StackingStore.get")(function* run(
        command: GetStackingCommand
      ) {
        return yield* runStackingGet(command);
      }),
    })
  );
}

export { StackingStore };

export type { StackingStoreApi };
