import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { getPublish } from "../../../shared/actions/publish/get.js";
import { PublishStore } from "../../publish/publish-store.js";
import type { Handle } from "../_core/handler.js";

type GetPublishInput = Input<typeof getPublish>;

const handle = Effect.fn("publish.get")(function* run(input: GetPublishInput) {
  const store = yield* PublishStore;

  return yield* store.cliState(input.fresh === "1");
}) satisfies Handle<typeof getPublish>;

export { handle };
