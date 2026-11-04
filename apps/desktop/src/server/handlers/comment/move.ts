import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { moveComment } from "../../../shared/actions/comment/move.js";
import { CommentThreadStore } from "../../comments/index.js";
import type { Handle } from "../_core/handler.js";

type MoveCommentInput = Input<typeof moveComment>;

const handle = Effect.fn("comment.move")(function* run(
  input: MoveCommentInput
) {
  const threads = yield* CommentThreadStore;

  const comments = yield* threads.reorder(
    { directionId: input.directionId, projectId: input.projectId },
    input.ids
  );

  return { comments };
}) satisfies Handle<typeof moveComment>;

export { handle };
