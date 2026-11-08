import { Context, Effect, Layer } from "effect";

import type { KnownFailure } from "../../platform/attempt/index.js";
import type { PlaceImageResult } from "./deps.js";
import { runImagePlace } from "./image-search-run.js";
import type { InsertImageSearchCommand } from "./image-search-run.js";

interface ImageSearchWriterApi {
  readonly insert: (
    command: InsertImageSearchCommand
  ) => Effect.Effect<PlaceImageResult, KnownFailure>;
}

class ImageSearchWriter extends Context.Service<
  ImageSearchWriter,
  ImageSearchWriterApi
>()("design-studio/share/ImageSearchWriter") {
  declare public readonly access: "write";

  public static readonly layer = Layer.succeed(
    ImageSearchWriter,
    ImageSearchWriter.of({
      insert: Effect.fn("ImageSearchWriter.insert")(function* run(
        command: InsertImageSearchCommand
      ) {
        return yield* runImagePlace(command);
      }),
    })
  );
}

export { ImageSearchWriter };

export type { ImageSearchWriterApi };
