import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { listComments } from "../../../shared/actions/comments/list.js";
import { CommentStore } from "../../comments/index.js";
import type { Handle } from "../_core/handler.js";

type ListCommentsInput = Input<typeof listComments>;

const handle = Effect.fn("comments.list")(function* run(
  input: ListCommentsInput
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
}) satisfies Handle<typeof listComments>;

export { handle };
