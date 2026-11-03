import { Context, Effect, Layer } from "effect";

import type { KnownFailure } from "../platform/attempt/index.js";
import { attemptContent } from "./content-runtime.js";
import { runContent } from "./write-content.js";
import type { ContentCommand, ContentWritten } from "./write-content.js";

interface ContentWriterApi {
  readonly apply: (
    command: ContentCommand
  ) => Effect.Effect<ContentWritten, KnownFailure>;
}

class ContentWriter extends Context.Service<ContentWriter, ContentWriterApi>()(
  "design-studio/content/ContentWriter"
) {
  declare public readonly access: "write";

  public static readonly layer = Layer.succeed(
    ContentWriter,
    ContentWriter.of({
      apply: Effect.fn("ContentWriter.apply")(function* run(
        command: ContentCommand
      ) {
        return yield* attemptContent((runtime) => runContent(runtime, command));
      }),
    })
  );
}

export { ContentWriter };

export type { ContentWriterApi };
