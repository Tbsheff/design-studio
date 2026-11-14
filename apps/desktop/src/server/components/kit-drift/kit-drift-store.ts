import { Context, Effect, Layer } from "effect";

import { viewportRuntime } from "./deps.js";
import type { KnownFailure } from "./deps.js";
import type { KitDriftPage, ListKitDriftCommand } from "./kit-drift-list.js";
import { runKitDriftListEffect } from "./kit-drift-run.js";

interface KitDriftStoreApi {
  readonly list: (
    command: ListKitDriftCommand
  ) => Effect.Effect<KitDriftPage, KnownFailure>;
}

class KitDriftStore extends Context.Service<KitDriftStore, KitDriftStoreApi>()(
  "design-studio/components/KitDriftStore"
) {
  declare public readonly access: "read";

  public static readonly layer = Layer.succeed(
    KitDriftStore,
    KitDriftStore.of({
      list: Effect.fn("KitDriftStore.list")(function* run(
        command: ListKitDriftCommand
      ) {
        const runtime = yield* viewportRuntime;

        return yield* runKitDriftListEffect(command, runtime.preview);
      }),
    })
  );
}

export { KitDriftStore };

export type { KitDriftStoreApi };
