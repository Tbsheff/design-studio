import { NotFound } from "@design-studio/actions/_core/errors/not-found";
import type { WalkthroughSchema } from "@design-studio/actions/walkthrough/schema";
import { Context, Effect, Layer } from "effect";

import { viewportRuntime } from "../../viewport/index.js";
import { readSavedWalkthrough, toSavedPath } from "./walkthrough-saved.js";

interface GetCommand {
  readonly projectId: string;
  readonly walkthroughId: string;
}

interface WalkthroughStoreApi {
  readonly get: (
    command: GetCommand
  ) => Effect.Effect<typeof WalkthroughSchema.Type, NotFound>;
}

class WalkthroughStore extends Context.Service<
  WalkthroughStore,
  WalkthroughStoreApi
>()("design-studio/review/WalkthroughStore") {
  declare public readonly access: "read";

  public static readonly layer = Layer.succeed(
    WalkthroughStore,
    WalkthroughStore.of({
      get: Effect.fn("WalkthroughStore.get")(function* run(
        command: GetCommand
      ) {
        const runtime = yield* viewportRuntime;

        const saved = yield* readSavedWalkthrough(
          toSavedPath(
            runtime.projectDir(command.projectId),
            command.walkthroughId
          )
        );

        if (saved === null) {
          return yield* new NotFound({
            message: `No walkthrough ${command.walkthroughId} is saved. Run run_walkthrough first.`,
          });
        }

        return saved.result;
      }),
    })
  );
}

export { WalkthroughStore };

export type { GetCommand, WalkthroughStoreApi };
