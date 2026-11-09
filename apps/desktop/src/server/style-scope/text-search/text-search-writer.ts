import { Context, Effect, Layer } from "effect";

import type { KnownFailure } from "../../platform/attempt/index.js";
import type { TextRangeResult } from "./apply-range.js";
import type { TextUpdateResult } from "./deps.js";
import { runTextRange, runTextUpdate } from "./text-search-run.js";
import type {
  ApplyRangeCommand,
  UpdateTextCommand,
} from "./text-search-run.js";

interface TextSearchWriterApi {
  readonly applyRange: (
    command: ApplyRangeCommand
  ) => Effect.Effect<TextRangeResult, KnownFailure>;
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
      applyRange: Effect.fn("TextSearchWriter.applyRange")(function* run(
        command: ApplyRangeCommand
      ) {
        return yield* runTextRange(command);
      }),
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
