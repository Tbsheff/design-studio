import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { insertComments } from "../../../shared/actions/comments/insert.js";
import { CommentThreadStore } from "../../comments/index.js";
import type { Handle } from "../_core/handler.js";

type InsertCommentsInput = Input<typeof insertComments>;

const handle = Effect.fn("comments.insert")(function* run(
  input: InsertCommentsInput
) {
  const threads = yield* CommentThreadStore;

  return yield* threads.insert({
    author: input.author ?? null,
    directionId: input.directionId ?? null,
    path: input.path ?? null,
    projectId: input.projectId,
    selector: input.selector ?? null,
    text: input.text,
  });
}) satisfies Handle<typeof insertComments>;

export { handle };
