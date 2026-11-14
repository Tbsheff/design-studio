import type { PageFlow } from "@design-studio/actions/page/flow/schema";
import { Context, Effect, Layer } from "effect";

import { runDirectionRead } from "../../direct-edit/index.js";
import type { KnownFailure } from "../../platform/attempt/index.js";
import { inspectDirectionFlow } from "./page-flow-read.js";

interface PageFlowRead {
  readonly directionId: string;
  readonly entry: string | null;
  readonly projectId: string;
}

interface PageFlowStoreApi {
  readonly inspect: (
    query: PageFlowRead
  ) => Effect.Effect<PageFlow, KnownFailure>;
}

class PageFlowStore extends Context.Service<PageFlowStore, PageFlowStoreApi>()(
  "design-studio/canvas/PageFlowStore"
) {
  declare public readonly access: "read";

  public static readonly layer = Layer.succeed(
    PageFlowStore,
    PageFlowStore.of({
      inspect: Effect.fn("PageFlowStore.inspect")(function* run(
        query: PageFlowRead
      ) {
        return yield* runDirectionRead<PageFlow>(
          query,
          (target) => inspectDirectionFlow(target, query.entry),
          (): null => null
        );
      }),
    })
  );
}

export { PageFlowStore };

export type { PageFlowRead, PageFlowStoreApi };
