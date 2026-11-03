import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { createComment } from "../../../shared/actions/comment/create.js";
import { CommentThreadStore } from "../../comments/index.js";
import type { CreateCommentInput } from "../../store/index.js";
import type { Handle } from "../_core/handler.js";
import { toWritable } from "../_core/writable.js";

type CreateCommentActionInput = Input<typeof createComment>;

const toCreateInput = (
  body: Omit<CreateCommentActionInput, "directionId" | "projectId">
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

const handle = Effect.fn("comment.create")(function* run(
  input: CreateCommentActionInput
) {
  const threads = yield* CommentThreadStore;

  const { directionId, projectId, ...body } = input;

  return yield* threads.create({ directionId, projectId }, toCreateInput(body));
}) satisfies Handle<typeof createComment>;

export { handle };
