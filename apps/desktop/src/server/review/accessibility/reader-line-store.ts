import { Context, Effect, Layer } from "effect";

import type { KnownFailure } from "../../platform/attempt/index.js";
import { runReaderLines } from "./reader-run.js";
import type {
  ListReaderLinesCommand,
  ReaderLinesResult,
} from "./reader-run.js";

interface ReaderLineStoreApi {
  readonly list: (
    command: ListReaderLinesCommand
  ) => Effect.Effect<ReaderLinesResult, KnownFailure>;
}

class ReaderLineStore extends Context.Service<
  ReaderLineStore,
  ReaderLineStoreApi
>()("design-studio/review/ReaderLineStore") {
  declare public readonly access: "read";

  public static readonly layer = Layer.succeed(
    ReaderLineStore,
    ReaderLineStore.of({
      list: Effect.fn("ReaderLineStore.list")(function* run(
        command: ListReaderLinesCommand
      ) {
        return yield* runReaderLines(command);
      }),
    })
  );
}

export { ReaderLineStore };

export type { ReaderLineStoreApi };
