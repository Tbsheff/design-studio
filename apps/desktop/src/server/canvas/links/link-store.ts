import { Context, Effect, Layer } from "effect";

import type { PrototypeLink } from "@design-studio/actions/_core/links";
import { readImplicitList, readLinkList } from "./link-ops.js";
import type { LinkListed, LinkListQuery } from "./link-ops.js";
import { attemptLink } from "./link-runtime.js";
import type { LinkFailure } from "./link-runtime.js";

interface LinkStoreApi {
  readonly implicit: (
    projectId: string
  ) => Effect.Effect<readonly PrototypeLink[], LinkFailure>;
  readonly list: (
    query: LinkListQuery
  ) => Effect.Effect<LinkListed, LinkFailure>;
}

class LinkStore extends Context.Service<LinkStore, LinkStoreApi>()(
  "design-studio/canvas/LinkStore"
) {
  declare public readonly access: "read";

  public static readonly layer = Layer.succeed(
    LinkStore,
    LinkStore.of({
      implicit: Effect.fn("LinkStore.implicit")(function* run(
        projectId: string
      ) {
        return yield* attemptLink((runtime) =>
          readImplicitList(runtime, projectId)
        );
      }),
      list: Effect.fn("LinkStore.list")(function* run(query: LinkListQuery) {
        return yield* attemptLink((runtime) => readLinkList(runtime, query));
      }),
    })
  );
}

export { LinkStore };

export type { LinkStoreApi };
