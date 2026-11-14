import type { Input } from "@design-studio/actions/_core/action";
import type { getPublish } from "@design-studio/actions/publish/get";
import { Effect } from "effect";

import { PublishStore } from "../../publish/index.js";
import type { Handle } from "../_core/handler.js";

type GetPublishInput = Input<typeof getPublish>;

const handle = Effect.fn("publish.get")(function* run(input: GetPublishInput) {
  const store = yield* PublishStore;

  return yield* store.cliState(input.fresh === "1");
}) satisfies Handle<typeof getPublish>;

export { handle };
