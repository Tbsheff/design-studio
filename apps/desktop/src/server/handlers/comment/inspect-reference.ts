import type { Input } from "@design-studio/actions/_core/action";
import type { inspectReferenceComment } from "@design-studio/actions/comment/inspect-reference";
import { Effect } from "effect";

import { CommentStore } from "../../comments/index.js";
import type { Handle } from "../_core/handler.js";

type InspectReferenceCommentInput = Input<typeof inspectReferenceComment>;

const handle = Effect.fn("comment.inspectReference")(function* run(
  input: InspectReferenceCommentInput
) {
  const store = yield* CommentStore;

  return yield* store.inspectReference({
    directionId: input.directionId ?? null,
    frame: input.frame ?? null,
    image: input.image,
    path: input.path ?? null,
    projectId: input.projectId,
  });
}) satisfies Handle<typeof inspectReferenceComment>;

export { handle };
