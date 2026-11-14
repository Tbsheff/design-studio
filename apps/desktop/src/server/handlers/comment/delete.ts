import type { Input } from "@design-studio/actions/_core/action";
import type { deleteComment } from "@design-studio/actions/comment/delete";
import { Effect } from "effect";

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
