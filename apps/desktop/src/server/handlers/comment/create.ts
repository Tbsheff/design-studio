import type { Input } from "@design-studio/actions/_core/action";
import type { createComment } from "@design-studio/actions/comment/create";
import { Effect } from "effect";

import { CommentThreadStore } from "../../comments/index.js";
import type { CreateCommentInput as CommentCreateBody } from "../../store/index.js";
import type { Handle } from "../_core/handler.js";
import { toWritable } from "../_core/writable.js";

type CreateCommentInput = Input<typeof createComment>;

const toCreateInput = (
  body: Omit<CreateCommentInput, "directionId" | "projectId">
): CommentCreateBody => {
  const { attachmentIds, mentions, ...rest } = body;

  const out: CommentCreateBody = toWritable(rest);

  if (attachmentIds) {
    out.attachmentIds = [...attachmentIds];
  }

  if (mentions && mentions.length > 0) {
    out.mentions = [...mentions];
  }

  return out;
};

const handle = Effect.fn("comment.create")(function* run(
  input: CreateCommentInput
) {
  const threads = yield* CommentThreadStore;

  const { directionId, projectId, ...body } = input;

  return yield* threads.create({ directionId, projectId }, toCreateInput(body));
}) satisfies Handle<typeof createComment>;

export { handle };
