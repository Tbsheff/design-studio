import type { Input } from "@design-studio/actions/_core/action";
import type { setPublish } from "@design-studio/actions/publish/set";
import { Effect } from "effect";

import { PublishService } from "../../publish/index.js";
import type { Handle } from "../_core/handler.js";

type SetPublishInput = Input<typeof setPublish>;

const handle = Effect.fn("publish.set")(function* run(input: SetPublishInput) {
  const service = yield* PublishService;

  return yield* service.setAccount(input.accountId);
}) satisfies Handle<typeof setPublish>;

export { handle };
