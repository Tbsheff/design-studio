import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { inspectPublish } from "../../../shared/actions/publish/inspect.js";
import { PublishStore } from "../../publish/publish-store.js";
import type { Handle } from "../_core/handler.js";

type InspectPublishInput = Input<typeof inspectPublish>;

const handle = Effect.fn("publish.inspect")(function* run(
  input: InspectPublishInput
) {
  const store = yield* PublishStore;

  return yield* store.backendState(input.check === "1");
}) satisfies Handle<typeof inspectPublish>;

export { handle };
