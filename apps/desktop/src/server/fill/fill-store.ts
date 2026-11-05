import { Context, Effect, Layer } from "effect";

import type { KnownFailure } from "../platform/attempt/index.js";
import type { FillInfo } from "./deps.js";
import { runFillGet } from "./fill-run.js";
import type { GetFillCommand } from "./fill-run.js";

interface FillStoreApi {
  readonly get: (
    command: GetFillCommand
  ) => Effect.Effect<FillInfo, KnownFailure>;
}

class FillStore extends Context.Service<FillStore, FillStoreApi>()(
  "design-studio/fill/FillStore"
) {
  declare public readonly access: "read";

  public static readonly layer = Layer.succeed(
    FillStore,
    FillStore.of({
      get: Effect.fn("FillStore.get")(function* run(command: GetFillCommand) {
        return yield* runFillGet(command);
      }),
    })
  );
}

export { FillStore };

export type { FillStoreApi };
