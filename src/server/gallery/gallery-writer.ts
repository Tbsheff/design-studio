import { Context, Effect, Layer } from "effect";

import { createGalleryFolder } from "./create-gallery.js";
import type { GalleryCommand, GalleryCreated } from "./create-gallery.js";
import type { KnownFailure } from "./deps.js";
import { galleryRuntime } from "./gallery-runtime.js";

interface GalleryWriterApi {
  readonly create: (
    command: GalleryCommand
  ) => Effect.Effect<GalleryCreated, KnownFailure>;
}

class GalleryWriter extends Context.Service<GalleryWriter, GalleryWriterApi>()(
  "design-studio/gallery/GalleryWriter"
) {
  declare public readonly access: "write";

  public static readonly layer = Layer.succeed(
    GalleryWriter,
    GalleryWriter.of({
      create: Effect.fn("GalleryWriter.create")(function* run(
        command: GalleryCommand
      ) {
        const runtime = yield* galleryRuntime;

        return yield* createGalleryFolder(runtime, command);
      }),
    })
  );
}

export { GalleryWriter };

export type { GalleryWriterApi };
