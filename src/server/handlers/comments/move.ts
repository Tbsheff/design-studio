import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { moveComments } from "../../../shared/actions/comments/move.js";
import { CommentThreadStore } from "../../comments/index.js";
import type { Handle } from "../_core/handler.js";

type MoveCommentsInput = Input<typeof moveComments>;

const handle = Effect.fn("comments.move")(function* run(
  input: MoveCommentsInput
) {
  const threads = yield* CommentThreadStore;

  const comments = yield* threads.reorder(
    { directionId: input.directionId, projectId: input.projectId },
    input.ids
  );

  return { comments };
}) satisfies Handle<typeof moveComments>;

export { handle };
