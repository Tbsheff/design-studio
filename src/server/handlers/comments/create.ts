import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { createComments } from "../../../shared/actions/comments/create.js";
import { CommentThreadStore } from "../../comments/index.js";
import type { CreateCommentInput } from "../../store/index.js";
import type { Handle } from "../_core/handler.js";
import { toWritable } from "../_core/writable.js";

type CreateCommentsInput = Input<typeof createComments>;

const toCreateInput = (
  body: Omit<CreateCommentsInput, "directionId" | "projectId">
): CreateCommentInput => {
  const { attachmentIds, mentions, ...rest } = body;

  const out: CreateCommentInput = toWritable(rest);

  if (attachmentIds) {
    out.attachmentIds = [...attachmentIds];
  }

  if (mentions && mentions.length > 0) {
    out.mentions = [...mentions];
  }

  return out;
};

const handle = Effect.fn("comments.create")(function* run(
  input: CreateCommentsInput
) {
  const threads = yield* CommentThreadStore;

  const { directionId, projectId, ...body } = input;

  return yield* threads.create({ directionId, projectId }, toCreateInput(body));
}) satisfies Handle<typeof createComments>;

export { handle };
