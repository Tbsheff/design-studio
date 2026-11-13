import type { PageMatchesUpdated } from "@design-studio/actions/page/match/schema";
import { Context, Effect, Layer } from "effect";

import { runDirectionWrite } from "../../direct-edit/index.js";
import type { KnownFailure } from "../../platform/attempt/index.js";
import type { PageMatchCommand } from "./page-match-read.js";
import { updatePageMatches } from "./page-match-write.js";

interface PageMatchUpdate extends PageMatchCommand {
  readonly directionId: string;
  readonly projectId: string;
}

interface PageMatchWriterApi {
  readonly update: (
    command: PageMatchUpdate
  ) => Effect.Effect<PageMatchesUpdated, KnownFailure>;
}

class PageMatchWriter extends Context.Service<
  PageMatchWriter,
  PageMatchWriterApi
>()("design-studio/canvas/PageMatchWriter") {
  declare public readonly access: "write";

  public static readonly layer = Layer.succeed(
    PageMatchWriter,
    PageMatchWriter.of({
      update: Effect.fn("PageMatchWriter.update")(function* run(
        command: PageMatchUpdate
      ) {
        return yield* runDirectionWrite<PageMatchesUpdated>(
          command,
          (target) => updatePageMatches(target, command),
          (): null => null
        );
      }),
    })
  );
}

export { PageMatchWriter };

export type { PageMatchUpdate, PageMatchWriterApi };
