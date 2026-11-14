import type { Input } from "@design-studio/actions/_core/action";
import type { insertComment } from "@design-studio/actions/comment/insert";
import { Effect } from "effect";

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
