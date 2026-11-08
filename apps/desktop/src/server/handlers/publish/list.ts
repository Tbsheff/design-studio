import type { Input } from "@design-studio/actions/_core/action";
import type { listPublish } from "@design-studio/actions/publish/list";
import { Effect } from "effect";

import { toPage } from "../../platform/page/index.js";
import { LinkedPublicationStore } from "../../publish/index.js";
import type { Handle } from "../_core/handler.js";

type ListPublishInput = Input<typeof listPublish>;

const handle = Effect.fn("publish.list")(function* run(
  input: ListPublishInput
) {
  const store = yield* LinkedPublicationStore;

  const list = yield* store.list(input.projectId);

  return {
    ...toPage(list.publications, input.cursor, input.limit),
    backendError: list.backendError,
  };
}) satisfies Handle<typeof listPublish>;

export { handle };
