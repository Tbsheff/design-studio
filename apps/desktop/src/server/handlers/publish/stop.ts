import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { stopPublish } from "../../../shared/actions/publish/stop.js";
import { PublishService } from "../../publish/index.js";
import type { Handle } from "../_core/handler.js";

type StopPublishInput = Input<typeof stopPublish>;

const handle = Effect.fn("publish.stop")(function* run(
  _input: StopPublishInput
) {
  const service = yield* PublishService;

  return yield* service.cancelLogin();
}) satisfies Handle<typeof stopPublish>;

export { handle };
