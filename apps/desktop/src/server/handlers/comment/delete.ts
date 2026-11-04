import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { deleteComment } from "../../../shared/actions/comment/delete.js";
import { CommentThreadStore } from "../../comments/index.js";
import type { Handle } from "../_core/handler.js";

type DeleteCommentInput = Input<typeof deleteComment>;

const handle = Effect.fn("comment.delete")(function* run(
  input: DeleteCommentInput
) {
  const threads = yield* CommentThreadStore;

  yield* threads.remove(
    { directionId: input.directionId, projectId: input.projectId },
    input.commentId
  );

  return { ok: true };
}) satisfies Handle<typeof deleteComment>;

export { handle };
