import { Context, Effect, Layer } from "effect";

import { getImpactRecord } from "./impact-memory.js";
import type { ImpactGetQuery, ImpactResult } from "./impact-types.js";

interface ImpactStoreApi {
  readonly get: (query: ImpactGetQuery) => Effect.Effect<ImpactResult>;
}

const EMPTY_RESULT: ImpactResult = {
  at: null,
  component: null,
  file: null,
  hasBaseline: false,
  phase: "none",
  routes: [],
};

class ImpactStore extends Context.Service<ImpactStore, ImpactStoreApi>()(
  "design-studio/review/ImpactStore"
) {
  declare public readonly access: "read";

  public static readonly layer = Layer.succeed(
    ImpactStore,
    ImpactStore.of({
      get: Effect.fn("ImpactStore.get")(function* run(query: ImpactGetQuery) {
        return yield* Effect.sync(
          () => getImpactRecord(query)?.last ?? EMPTY_RESULT
        );
      }),
    })
  );
}

export { ImpactStore };

export type { ImpactStoreApi };
