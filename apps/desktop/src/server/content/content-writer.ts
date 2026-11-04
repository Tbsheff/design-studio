import { Context, Effect, Layer } from "effect";

import { BadRequest } from "@design-studio/actions/_core/errors/bad-request";
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
        const outcome = yield* attemptContent((runtime) =>
          runContent(runtime, command)
        );

        if ("refused" in outcome) {
          return yield* new BadRequest({ message: outcome.refused });
        }

        return outcome;
      }),
    })
  );
}

export { ContentWriter };

export type { ContentWriterApi };
