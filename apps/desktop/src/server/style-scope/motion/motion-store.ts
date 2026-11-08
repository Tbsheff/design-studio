import { Context, Effect, Layer } from "effect";

import type { KnownFailure } from "../../platform/attempt/index.js";
import type { MotionInfo } from "./deps.js";
import { runMotionGet } from "./motion-run.js";
import type { GetMotionCommand } from "./motion-run.js";

interface MotionStoreApi {
  readonly get: (
    command: GetMotionCommand
  ) => Effect.Effect<MotionInfo, KnownFailure>;
}

class MotionStore extends Context.Service<MotionStore, MotionStoreApi>()(
  "design-studio/style-scope/MotionStore"
) {
  declare public readonly access: "read";

  public static readonly layer = Layer.succeed(
    MotionStore,
    MotionStore.of({
      get: Effect.fn("MotionStore.get")(function* run(
        command: GetMotionCommand
      ) {
        return yield* runMotionGet(command);
      }),
    })
  );
}

export { MotionStore };

export type { MotionStoreApi };
