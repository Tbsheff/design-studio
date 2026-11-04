import { Effect } from "effect";

import type { Input } from "@design-studio/actions/_core/action";
import type { listPublish } from "@design-studio/actions/publish/list";
import { LinkedPublicationStore } from "../../publish/index.js";
import type { Handle } from "../_core/handler.js";

type ListPublishInput = Input<typeof listPublish>;

const handle = Effect.fn("publish.list")(function* run(
  input: ListPublishInput
) {
  const store = yield* LinkedPublicationStore;

  return yield* store.list(input.projectId);
}) satisfies Handle<typeof listPublish>;

export { handle };
