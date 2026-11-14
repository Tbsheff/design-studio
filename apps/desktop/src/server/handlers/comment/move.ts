import type { Input } from "@design-studio/actions/_core/action";
import type { moveComment } from "@design-studio/actions/comment/move";
import { Effect } from "effect";

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
