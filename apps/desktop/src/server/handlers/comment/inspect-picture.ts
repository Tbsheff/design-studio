import type { Input } from "@design-studio/actions/_core/action";
import type { inspectPictureComment } from "@design-studio/actions/comment/inspect-picture";
import { Effect } from "effect";

import { CommentStore } from "../../comments/index.js";
import type { Handle } from "../_core/handler.js";

type InspectPictureCommentInput = Input<typeof inspectPictureComment>;

const handle = Effect.fn("comment.inspectPicture")(function* run(
  input: InspectPictureCommentInput
) {
  const store = yield* CommentStore;

  return yield* store.inspectReference({
    directionId: input.directionId ?? null,
    frame: input.frame ?? null,
    image: input.image,
    limit: input.limit ?? null,
    path: input.path ?? null,
    projectId: input.projectId,
  });
}) satisfies Handle<typeof inspectPictureComment>;

export { handle };
