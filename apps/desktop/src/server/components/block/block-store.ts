import { Context, Effect, Layer } from "effect";

import type { BlockPage, ListBlockCommand } from "./block-list.js";
import { runBlockListEffect } from "./block-run.js";
import type { KnownFailure } from "./deps.js";

interface BlockStoreApi {
  readonly list: (
    command: ListBlockCommand
  ) => Effect.Effect<BlockPage, KnownFailure>;
}

class BlockStore extends Context.Service<BlockStore, BlockStoreApi>()(
  "design-studio/components/BlockStore"
) {
  declare public readonly access: "read";

  public static readonly layer = Layer.succeed(
    BlockStore,
    BlockStore.of({
      list: Effect.fn("BlockStore.list")(function* run(
        command: ListBlockCommand
      ) {
        return yield* runBlockListEffect(command);
      }),
    })
  );
}

export { BlockStore };

export type { BlockStoreApi };
