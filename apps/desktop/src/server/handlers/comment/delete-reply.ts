import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { deleteReplyComment } from "../../../shared/actions/comment/delete-reply.js";
import { CommentThreadStore } from "../../comments/index.js";
import type { Handle } from "../_core/handler.js";

type DeleteReplyCommentInput = Input<typeof deleteReplyComment>;

const handle = Effect.fn("comment.deleteReply")(function* run(
  input: DeleteReplyCommentInput
) {
  const threads = yield* CommentThreadStore;

  return yield* threads.removeReply(
    { directionId: input.directionId, projectId: input.projectId },
    input.commentId,
    input.replyId
  );
}) satisfies Handle<typeof deleteReplyComment>;

export { handle };
