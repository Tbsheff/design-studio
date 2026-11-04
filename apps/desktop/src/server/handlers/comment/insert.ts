import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { insertComment } from "../../../shared/actions/comment/insert.js";
import { CommentThreadStore } from "../../comments/index.js";
import type { Handle } from "../_core/handler.js";

type InsertCommentInput = Input<typeof insertComment>;

const handle = Effect.fn("comment.insert")(function* run(
  input: InsertCommentInput
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
}) satisfies Handle<typeof insertComment>;

export { handle };
