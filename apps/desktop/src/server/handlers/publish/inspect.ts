import type { Input } from "@design-studio/actions/_core/action";
import type { inspectPublish } from "@design-studio/actions/publish/inspect";
import { Effect } from "effect";

import { PublishStore } from "../../publish/index.js";
import type { Handle } from "../_core/handler.js";

type InspectPublishInput = Input<typeof inspectPublish>;

const handle = Effect.fn("publish.inspect")(function* run(
  input: InspectPublishInput
) {
  const store = yield* PublishStore;

  return yield* store.backendState(input.check === "1");
}) satisfies Handle<typeof inspectPublish>;

export { handle };
