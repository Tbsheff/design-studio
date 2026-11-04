import { Effect } from "effect";

import type { Input } from "@design-studio/actions/_core/action";
import type { applyPublish } from "@design-studio/actions/publish/apply";
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
