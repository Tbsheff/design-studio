import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { exportComment } from "../../../shared/actions/comment/export.js";
import { CommentThreadStore } from "../../comments/index.js";
import type { Handle } from "../_core/handler.js";

type ExportCommentInput = Input<typeof exportComment>;

const handle = Effect.fn("comment.export")(function* run(
  input: ExportCommentInput
) {
  const threads = yield* CommentThreadStore;

  return yield* threads.prefill(
    { directionId: input.directionId, projectId: input.projectId },
    input.ids
  );
}) satisfies Handle<typeof exportComment>;

export { handle };
