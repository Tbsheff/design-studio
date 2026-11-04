import { Effect } from "effect";

import type { Input } from "@design-studio/actions/_core/action";
import type { listCommentsPublish } from "@design-studio/actions/publish/list-comments";
import { PublishStore } from "../../publish/index.js";
import type { Handle } from "../_core/handler.js";

type ListCommentsPublishInput = Input<typeof listCommentsPublish>;

const handle = Effect.fn("publish.listComments")(function* run(
  input: ListCommentsPublishInput
) {
  const store = yield* PublishStore;

  return yield* store.comments(input.projectId, input.publicationId);
}) satisfies Handle<typeof listCommentsPublish>;

export { handle };
