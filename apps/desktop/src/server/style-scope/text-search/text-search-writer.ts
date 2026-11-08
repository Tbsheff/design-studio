import { Context, Effect, Layer } from "effect";

import type { KnownFailure } from "../../platform/attempt/index.js";
import type { TextUpdateResult } from "./deps.js";
import { runTextUpdate } from "./text-search-run.js";
import type { UpdateTextCommand } from "./text-search-run.js";

interface TextSearchWriterApi {
  readonly update: (
    command: UpdateTextCommand
  ) => Effect.Effect<TextUpdateResult, KnownFailure>;
}

class TextSearchWriter extends Context.Service<
  TextSearchWriter,
  TextSearchWriterApi
>()("design-studio/style-scope/TextSearchWriter") {
  declare public readonly access: "write";

  public static readonly layer = Layer.succeed(
    TextSearchWriter,
    TextSearchWriter.of({
      update: Effect.fn("TextSearchWriter.update")(function* run(
        command: UpdateTextCommand
      ) {
        return yield* runTextUpdate(command);
      }),
    })
  );
}

export { TextSearchWriter };

export type { TextSearchWriterApi };
