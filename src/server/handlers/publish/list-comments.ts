import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { listCommentsPublish } from "../../../shared/actions/publish/list-comments.js";
import { PublishStore } from "../../publish/publish-store.js";
import type { Handle } from "../_core/handler.js";

type ListCommentsPublishInput = Input<typeof listCommentsPublish>;

const handle = Effect.fn("publish.listComments")(function* run(
  input: ListCommentsPublishInput
) {
  const store = yield* PublishStore;

  return yield* store.comments(input.projectId, input.publicationId);
}) satisfies Handle<typeof listCommentsPublish>;

export { handle };
