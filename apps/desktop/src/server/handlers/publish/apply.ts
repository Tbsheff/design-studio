import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { applyPublish } from "../../../shared/actions/publish/apply.js";
import { PublishService } from "../../publish/index.js";
import type { Handle } from "../_core/handler.js";

type ApplyPublishInput = Input<typeof applyPublish>;

const handle = Effect.fn("publish.apply")(function* run(
  input: ApplyPublishInput
) {
  const service = yield* PublishService;

  return yield* service.applyBackend(input.mode);
}) satisfies Handle<typeof applyPublish>;

export { handle };
