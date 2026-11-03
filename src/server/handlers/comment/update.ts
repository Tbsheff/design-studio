import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { updateComment } from "../../../shared/actions/comment/update.js";
import { CommentThreadStore } from "../../comments/index.js";
import type { Handle } from "../_core/handler.js";
import { toWritable } from "../_core/writable.js";

type UpdateCommentInput = Input<typeof updateComment>;

const handle = Effect.fn("comment.update")(function* run(
  input: UpdateCommentInput
) {
  const threads = yield* CommentThreadStore;

  const { commentId, directionId, projectId, ...patch } = input;

  return yield* threads.update(
    { directionId, projectId },
    commentId,
    toWritable(patch)
  );
}) satisfies Handle<typeof updateComment>;

export { handle };
