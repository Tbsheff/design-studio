import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { deleteReplyComments } from "../../../shared/actions/comments/delete-reply.js";
import { CommentThreadStore } from "../../comments/comment-thread-store.js";
import type { Handle } from "../_core/handler.js";

type DeleteReplyCommentsInput = Input<typeof deleteReplyComments>;

const handle = Effect.fn("comments.deleteReply")(function* run(
  input: DeleteReplyCommentsInput
) {
  const threads = yield* CommentThreadStore;

  return yield* threads.removeReply(
    { directionId: input.directionId, projectId: input.projectId },
    input.commentId,
    input.replyId
  );
}) satisfies Handle<typeof deleteReplyComments>;

export { handle };
