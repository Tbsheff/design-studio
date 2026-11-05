import { Context, Effect, Layer } from "effect";

import type { KnownFailure } from "../platform/attempt/index.js";
import { runIconInsert } from "./icon-run.js";
import type { IconInserted, InsertIconCommand } from "./icon-run.js";

interface IconWriterApi {
  readonly insert: (
    command: InsertIconCommand
  ) => Effect.Effect<IconInserted, KnownFailure>;
}

class IconWriter extends Context.Service<IconWriter, IconWriterApi>()(
  "design-studio/icons/IconWriter"
) {
  declare public readonly access: "write";

  public static readonly layer = Layer.succeed(
    IconWriter,
    IconWriter.of({
      insert: Effect.fn("IconWriter.insert")(function* run(
        command: InsertIconCommand
      ) {
        return yield* runIconInsert(command);
      }),
    })
  );
}

export { IconWriter };

export type { IconWriterApi };
