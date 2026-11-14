import { Context, Effect, Layer } from "effect";

import type { KnownFailure } from "../../platform/attempt/index.js";
import type { PlaceImageResult } from "./deps.js";
import { runImagePlace, runPhotoFill } from "./image-search-run.js";
import type {
  ApplyImageSearchCommand,
  InsertImageSearchCommand,
} from "./image-search-run.js";
import type { PhotoFillResult } from "./photo-fill.js";

interface ImageSearchWriterApi {
  readonly apply: (
    command: ApplyImageSearchCommand
  ) => Effect.Effect<PhotoFillResult, KnownFailure>;
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
      apply: Effect.fn("ImageSearchWriter.apply")(function* run(
        command: ApplyImageSearchCommand
      ) {
        return yield* runPhotoFill(command);
      }),
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
