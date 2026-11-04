import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { setResolvedComment } from "../../../shared/actions/comment/set-resolved.js";
import { CommentThreadStore } from "../../comments/index.js";
import type { Handle } from "../_core/handler.js";

type SetResolvedCommentInput = Input<typeof setResolvedComment>;

const handle = Effect.fn("comment.setResolved")(function* run(
  input: SetResolvedCommentInput
) {
  const threads = yield* CommentThreadStore;

  const comment = yield* threads.resolve(
    { directionId: input.directionId ?? null, projectId: input.projectId },
    input.commentId
  );

  return { commentId: comment.id, status: comment.status };
}) satisfies Handle<typeof setResolvedComment>;

export { handle };
