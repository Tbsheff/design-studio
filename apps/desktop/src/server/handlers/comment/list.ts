import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { listComment } from "../../../shared/actions/comment/list.js";
import { CommentStore } from "../../comments/index.js";
import type { Handle } from "../_core/handler.js";

type ListCommentInput = Input<typeof listComment>;

const handle = Effect.fn("comment.list")(function* run(
  input: ListCommentInput
) {
  const store = yield* CommentStore;

  return yield* store.list({
    cursor: input.cursor,
    directionId: input.directionId,
    frame: input.frame,
    limit: input.limit,
    projectId: input.projectId,
    status: input.status,
  });
}) satisfies Handle<typeof listComment>;

export { handle };
