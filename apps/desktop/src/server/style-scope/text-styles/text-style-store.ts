import { Context, Effect, Layer } from "effect";

import type { KnownFailure } from "../../platform/attempt/index.js";
import type { TextStyleList } from "./deps.js";
import { runTextStyleInspect } from "./text-style-run.js";
import type { InspectTextStyleCommand } from "./text-style-run.js";

interface TextStyleStoreApi {
  readonly inspect: (
    command: InspectTextStyleCommand
  ) => Effect.Effect<TextStyleList, KnownFailure>;
}

class TextStyleStore extends Context.Service<
  TextStyleStore,
  TextStyleStoreApi
>()("design-studio/style-scope/TextStyleStore") {
  declare public readonly access: "read";

  public static readonly layer = Layer.succeed(
    TextStyleStore,
    TextStyleStore.of({
      inspect: Effect.fn("TextStyleStore.inspect")(function* run(
        command: InspectTextStyleCommand
      ) {
        return yield* runTextStyleInspect(command);
      }),
    })
  );
}

export { TextStyleStore };

export type { TextStyleStoreApi };
