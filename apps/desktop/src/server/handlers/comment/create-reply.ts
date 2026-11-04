import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { createReplyComment } from "../../../shared/actions/comment/create-reply.js";
import { CommentThreadStore } from "../../comments/index.js";
import type { Handle } from "../_core/handler.js";

type CreateReplyCommentInput = Input<typeof createReplyComment>;

const handle = Effect.fn("comment.createReply")(function* run(
  input: CreateReplyCommentInput
) {
  const threads = yield* CommentThreadStore;

  const comment = yield* threads.addReply(
    { directionId: input.directionId ?? null, projectId: input.projectId },
    input.commentId,
    input.text,
    input.author ?? null
  );

  return { commentId: comment.id, replies: comment.replies?.length ?? 0 };
}) satisfies Handle<typeof createReplyComment>;

export { handle };
