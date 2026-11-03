import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import { BadRequest } from "../../../shared/actions/_core/errors/bad-request.js";
import { RunInProgress } from "../../../shared/actions/comments/errors/run-in-progress.js";
import type { startComments } from "../../../shared/actions/comments/start.js";
import { CommentRunStarter } from "../../comments/index.js";
import type { Handle } from "../_core/handler.js";

type StartCommentsInput = Input<typeof startComments>;

const handle = Effect.fn("comments.start")(function* run(
  input: StartCommentsInput
) {
  const starter = yield* CommentRunStarter;

  const outcome = yield* starter.start({
    contexts: input.contexts ?? null,
    directionId: input.directionId,
    ids: input.ids ?? null,
    level: input.level ?? null,
    projectId: input.projectId,
  });

  if (outcome.kind === "empty") {
    return yield* new BadRequest({ message: "no_comments" });
  }

  if (outcome.kind === "busy") {
    return yield* new RunInProgress({
      code: "run_in_progress",
      data: {},
      message:
        "A run is active in this direction. The comments stay queued. Send them again when the run stops.",
    });
  }

  return { comments: outcome.comments, runId: outcome.runId };
}) satisfies Handle<typeof startComments>;

export { handle };
