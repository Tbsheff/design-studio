import { Context, Effect, Layer } from "effect";

import { runDirectionWrite } from "../../direct-edit/index.js";
import type { KnownFailure } from "../../platform/attempt/index.js";
import { createPageFrames } from "./page-frames-ops.js";
import type { PageFramesQuery, PageFramesWritten } from "./page-frames-ops.js";

interface PageFramesCommand extends PageFramesQuery {
  readonly directionId: string;
  readonly projectId: string;
}

interface PageFramesWriterApi {
  readonly create: (
    command: PageFramesCommand
  ) => Effect.Effect<PageFramesWritten, KnownFailure>;
}

class PageFramesWriter extends Context.Service<
  PageFramesWriter,
  PageFramesWriterApi
>()("design-studio/canvas/PageFramesWriter") {
  declare public readonly access: "write";

  public static readonly layer = Layer.succeed(
    PageFramesWriter,
    PageFramesWriter.of({
      create: Effect.fn("PageFramesWriter.create")(function* run(
        command: PageFramesCommand
      ) {
        return yield* runDirectionWrite<PageFramesWritten>(
          command,
          (target) => createPageFrames(target, command),
          (): null => null
        );
      }),
    })
  );
}

export { PageFramesWriter };

export type { PageFramesCommand, PageFramesWriterApi };
