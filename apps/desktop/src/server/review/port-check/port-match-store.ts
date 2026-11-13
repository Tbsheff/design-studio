import type { PortMatch } from "@design-studio/actions/port/schema";
import { Context, Effect, Layer } from "effect";

import type { KnownFailure } from "../../platform/attempt/index.js";
import type { PortCheckQuery, PortReads } from "./port-check-query.js";
import { readPortMatch } from "./port-match-read.js";

interface PortMatchStoreApi {
  readonly inspect: (
    reads: PortReads,
    query: PortCheckQuery
  ) => Effect.Effect<PortMatch, KnownFailure>;
}

class PortMatchStore extends Context.Service<
  PortMatchStore,
  PortMatchStoreApi
>()("design-studio/review/PortMatchStore") {
  declare public readonly access: "read";

  public static readonly layer = Layer.succeed(
    PortMatchStore,
    PortMatchStore.of({
      inspect: Effect.fn("PortMatchStore.inspect")(function* run(
        reads: PortReads,
        query: PortCheckQuery
      ) {
        return yield* readPortMatch(reads, query);
      }),
    })
  );
}

export { PortMatchStore };

export type { PortMatchStoreApi };
