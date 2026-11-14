import type { Input } from "@design-studio/actions/_core/action";
import type { deleteCommentPublish } from "@design-studio/actions/publish/delete-comment";
import { Effect } from "effect";

import { PublishService } from "../../publish/index.js";
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
