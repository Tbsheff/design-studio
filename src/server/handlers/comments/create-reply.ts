import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { createReplyComments } from "../../../shared/actions/comments/create-reply.js";
import { CommentThreadStore } from "../../comments/comment-thread-store.js";
import type { Handle } from "../_core/handler.js";

type CreateReplyCommentsInput = Input<typeof createReplyComments>;

const handle = Effect.fn("comments.createReply")(function* run(
  input: CreateReplyCommentsInput
) {
  const threads = yield* CommentThreadStore;

  const comment = yield* threads.addReply(
    { directionId: input.directionId ?? null, projectId: input.projectId },
    input.commentId,
    input.text,
    input.author ?? null
  );

  return { commentId: comment.id, replies: comment.replies?.length ?? 0 };
}) satisfies Handle<typeof createReplyComments>;

export { handle };
