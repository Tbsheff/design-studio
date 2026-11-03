import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { updateComments } from "../../../shared/actions/comments/update.js";
import { CommentThreadStore } from "../../comments/index.js";
import type { Handle } from "../_core/handler.js";
import { toWritable } from "../_core/writable.js";

type UpdateCommentsInput = Input<typeof updateComments>;

const handle = Effect.fn("comments.update")(function* run(
  input: UpdateCommentsInput
) {
  const threads = yield* CommentThreadStore;

  const { commentId, directionId, projectId, ...patch } = input;

  return yield* threads.update(
    { directionId, projectId },
    commentId,
    toWritable(patch)
  );
}) satisfies Handle<typeof updateComments>;

export { handle };
