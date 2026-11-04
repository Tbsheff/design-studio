import { Context, Effect, Layer } from "effect";

import { attemptComments } from "./comment-core.js";
import type { CommentError } from "./comment-core.js";
import { startCommentRun } from "./comment-run-ops.js";
import type { StartOutcome, StartRequest } from "./comment-run-ops.js";

interface CommentRunStarterApi {
  readonly start: (
    request: StartRequest
  ) => Effect.Effect<StartOutcome, CommentError>;
}

class CommentRunStarter extends Context.Service<
  CommentRunStarter,
  CommentRunStarterApi
>()("design-studio/comments/CommentRunStarter") {
  declare public readonly access: "write";

  public static readonly layer = Layer.succeed(
    CommentRunStarter,
    CommentRunStarter.of({
      start: Effect.fn("CommentRunStarter.start")(function* run(
        request: StartRequest
      ) {
        return yield* attemptComments((runtime) =>
          startCommentRun(runtime, request)
        );
      }),
    })
  );
}

export { CommentRunStarter };

export type { CommentRunStarterApi };

export type { StartOutcome, StartRequest } from "./comment-run-ops.js";
