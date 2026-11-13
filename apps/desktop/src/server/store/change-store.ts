import type { ChangedLayers } from "@design-studio/actions/version/changes/schema";
import { Context, Effect, Layer } from "effect";

import { inspectChangedLayers } from "./change-read.js";
import type { ChangeQuery } from "./change-read.js";
import { attemptVersionRead } from "./version-read-core.js";
import type { VersionReadError } from "./version-read-core.js";

interface ChangeStoreApi {
  readonly layers: (
    query: ChangeQuery
  ) => Effect.Effect<ChangedLayers, VersionReadError>;
}

class ChangeStore extends Context.Service<ChangeStore, ChangeStoreApi>()(
  "design-studio/store/ChangeStore"
) {
  declare public readonly access: "read";

  public static readonly layer = Layer.succeed(
    ChangeStore,
    ChangeStore.of({
      layers: Effect.fn("ChangeStore.layers")(function* run(
        query: ChangeQuery
      ) {
        return yield* attemptVersionRead((runtime) =>
          inspectChangedLayers(runtime, query)
        );
      }),
    })
  );
}

export { ChangeStore };

export type { ChangeStoreApi };
