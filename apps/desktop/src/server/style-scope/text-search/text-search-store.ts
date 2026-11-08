import { Context, Effect, Layer } from "effect";

import type { KnownFailure } from "../../platform/attempt/index.js";
import type { TextSearchResult } from "./deps.js";
import { runTextInspect } from "./text-search-run.js";
import type { InspectTextCommand } from "./text-search-run.js";

interface TextSearchStoreApi {
  readonly inspect: (
    command: InspectTextCommand
  ) => Effect.Effect<TextSearchResult, KnownFailure>;
}

class TextSearchStore extends Context.Service<
  TextSearchStore,
  TextSearchStoreApi
>()("design-studio/style-scope/TextSearchStore") {
  declare public readonly access: "read";

  public static readonly layer = Layer.succeed(
    TextSearchStore,
    TextSearchStore.of({
      inspect: Effect.fn("TextSearchStore.inspect")(function* run(
        command: InspectTextCommand
      ) {
        return yield* runTextInspect(command);
      }),
    })
  );
}

export { TextSearchStore };

export type { TextSearchStoreApi };
