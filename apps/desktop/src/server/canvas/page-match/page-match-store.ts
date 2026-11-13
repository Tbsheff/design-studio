import type { PageMatches } from "@design-studio/actions/page/match/schema";
import { Context, Effect, Layer } from "effect";

import { runDirectionRead } from "../../direct-edit/index.js";
import type { KnownFailure } from "../../platform/attempt/index.js";
import { inspectPageMatches } from "./page-match-read.js";
import type { PageMatchQuery } from "./page-match-read.js";

interface PageMatchRead extends PageMatchQuery {
  readonly directionId: string;
  readonly projectId: string;
}

interface PageMatchStoreApi {
  readonly inspect: (
    query: PageMatchRead
  ) => Effect.Effect<PageMatches, KnownFailure>;
}

class PageMatchStore extends Context.Service<
  PageMatchStore,
  PageMatchStoreApi
>()("design-studio/canvas/PageMatchStore") {
  declare public readonly access: "read";

  public static readonly layer = Layer.succeed(
    PageMatchStore,
    PageMatchStore.of({
      inspect: Effect.fn("PageMatchStore.inspect")(function* run(
        query: PageMatchRead
      ) {
        return yield* runDirectionRead<PageMatches>(
          query,
          (target) => inspectPageMatches(target, query),
          (): null => null
        );
      }),
    })
  );
}

export { PageMatchStore };

export type { PageMatchRead, PageMatchStoreApi };
