import { Context, Effect, Layer } from "effect";

import { getSpeedRecord } from "./speed-memory.js";
import type { SpeedGetQuery, SpeedResult } from "./speed-types.js";

interface SpeedStoreApi {
  readonly get: (query: SpeedGetQuery) => Effect.Effect<SpeedResult>;
}

const EMPTY_RESULT: SpeedResult = {
  frameId: null,
  hasBaseline: false,
  isDevBuild: false,
  measure: { images: [], numbers: [] },
  phase: "none",
  route: null,
  runs: 0,
};

class SpeedStore extends Context.Service<SpeedStore, SpeedStoreApi>()(
  "design-studio/preview/SpeedStore"
) {
  declare public readonly access: "read";

  public static readonly layer = Layer.succeed(
    SpeedStore,
    SpeedStore.of({
      get: Effect.fn("SpeedStore.get")(function* run(query: SpeedGetQuery) {
        return yield* Effect.sync(
          () => getSpeedRecord(query)?.last ?? EMPTY_RESULT
        );
      }),
    })
  );
}

export { SpeedStore };

export type { SpeedStoreApi };
