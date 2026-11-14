import type { Input } from "@design-studio/actions/_core/action";
import type { exportComment } from "@design-studio/actions/comment/export";
import { Effect } from "effect";

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
