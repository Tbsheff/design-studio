import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { setResolvedComments } from "../../../shared/actions/comments/set-resolved.js";
import { CommentThreadStore } from "../../comments/comment-thread-store.js";
import type { Handle } from "../_core/handler.js";

type SetResolvedCommentsInput = Input<typeof setResolvedComments>;

const handle = Effect.fn("comments.setResolved")(function* run(
  input: SetResolvedCommentsInput
) {
  const threads = yield* CommentThreadStore;

  const comment = yield* threads.resolve(
    { directionId: input.directionId ?? null, projectId: input.projectId },
    input.commentId
  );

  return { commentId: comment.id, status: comment.status };
}) satisfies Handle<typeof setResolvedComments>;

export { handle };
