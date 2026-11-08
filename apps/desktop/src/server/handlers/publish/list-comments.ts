import type { Input } from "@design-studio/actions/_core/action";
import type { listCommentsPublish } from "@design-studio/actions/publish/list-comments";
import { Effect } from "effect";

import { toPage } from "../../platform/page/index.js";
import { PublishStore } from "../../publish/index.js";
import type { Handle } from "../_core/handler.js";

type ListCommentsPublishInput = Input<typeof listCommentsPublish>;

const handle = Effect.fn("publish.listComments")(function* run(
  input: ListCommentsPublishInput
) {
  const store = yield* PublishStore;

  const list = yield* store.comments(input.projectId, input.publicationId);

  return toPage(list.comments, input.cursor, input.limit);
}) satisfies Handle<typeof listCommentsPublish>;

export { handle };
