import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { exportComments } from "../../../shared/actions/comments/export.js";
import { CommentThreadStore } from "../../comments/comment-thread-store.js";
import type { Handle } from "../_core/handler.js";

type ExportCommentsInput = Input<typeof exportComments>;

const handle = Effect.fn("comments.export")(function* run(
  input: ExportCommentsInput
) {
  const threads = yield* CommentThreadStore;

  return yield* threads.prefill(
    { directionId: input.directionId, projectId: input.projectId },
    input.ids
  );
}) satisfies Handle<typeof exportComments>;

export { handle };
