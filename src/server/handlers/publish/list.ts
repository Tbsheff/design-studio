import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { listPublish } from "../../../shared/actions/publish/list.js";
import { PublishStore } from "../../publish/index.js";
import type { Handle } from "../_core/handler.js";

type ListPublishInput = Input<typeof listPublish>;

const handle = Effect.fn("publish.list")(function* run(
  input: ListPublishInput
) {
  const store = yield* PublishStore;

  return yield* store.list(input.projectId);
}) satisfies Handle<typeof listPublish>;

export { handle };
