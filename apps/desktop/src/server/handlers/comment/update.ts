import { Effect } from "effect";

import type { Input } from "@design-studio/actions/_core/action";
import type { updateComment } from "@design-studio/actions/comment/update";
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
