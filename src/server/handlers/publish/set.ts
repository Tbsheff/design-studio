import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { setPublish } from "../../../shared/actions/publish/set.js";
import { PublishService } from "../../publish/publications.js";
import type { Handle } from "../_core/handler.js";

type SetPublishInput = Input<typeof setPublish>;

const handle = Effect.fn("publish.set")(function* run(input: SetPublishInput) {
  const service = yield* PublishService;

  return yield* service.setAccount(input.accountId);
}) satisfies Handle<typeof setPublish>;

export { handle };
