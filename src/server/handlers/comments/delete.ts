import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { deleteComments } from "../../../shared/actions/comments/delete.js";
import { CommentThreadStore } from "../../comments/index.js";
import type { Handle } from "../_core/handler.js";

type DeleteCommentsInput = Input<typeof deleteComments>;

const handle = Effect.fn("comments.delete")(function* run(
  input: DeleteCommentsInput
) {
  const threads = yield* CommentThreadStore;

  yield* threads.remove(
    { directionId: input.directionId, projectId: input.projectId },
    input.commentId
  );

  return { ok: true };
}) satisfies Handle<typeof deleteComments>;

export { handle };
