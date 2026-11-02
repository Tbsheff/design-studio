import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { deleteCommentPublish } from "../../../shared/actions/publish/delete-comment.js";
import { PublishService } from "../../publish/publications.js";
import type { Handle } from "../_core/handler.js";

type DeleteCommentPublishInput = Input<typeof deleteCommentPublish>;

const handle = Effect.fn("publish.deleteComment")(function* run(
  input: DeleteCommentPublishInput
) {
  const service = yield* PublishService;

  yield* service.deleteComment(
    input.projectId,
    input.publicationId,
    input.commentId
  );

  return { ok: true as const };
}) satisfies Handle<typeof deleteCommentPublish>;

export { handle };
