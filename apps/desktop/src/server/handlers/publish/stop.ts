import { Effect } from "effect";

import type { Input } from "@design-studio/actions/_core/action";
import type { stopPublish } from "@design-studio/actions/publish/stop";
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
