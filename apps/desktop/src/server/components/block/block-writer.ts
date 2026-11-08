import { Context, Effect, Layer } from "effect";

import type { BlockInserted, InsertBlockCommand } from "./block-insert.js";
import { runBlockInsertEffect } from "./block-run.js";
import type { KnownFailure } from "./deps.js";

interface BlockWriterApi {
  readonly insert: (
    command: InsertBlockCommand
  ) => Effect.Effect<BlockInserted, KnownFailure>;
}

class BlockWriter extends Context.Service<BlockWriter, BlockWriterApi>()(
  "design-studio/components/BlockWriter"
) {
  declare public readonly access: "write";

  public static readonly layer = Layer.succeed(
    BlockWriter,
    BlockWriter.of({
      insert: Effect.fn("BlockWriter.insert")(function* run(
        command: InsertBlockCommand
      ) {
        return yield* runBlockInsertEffect(command);
      }),
    })
  );
}

export { BlockWriter };

export type { BlockWriterApi };
