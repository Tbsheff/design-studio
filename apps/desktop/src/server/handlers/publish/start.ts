import { Effect } from "effect";

import type { Input } from "@design-studio/actions/_core/action";
import type { startPublish } from "@design-studio/actions/publish/start";
import { PublishService } from "../../publish/index.js";
import type { Handle } from "../_core/handler.js";

type StartPublishInput = Input<typeof startPublish>;

const handle = Effect.fn("publish.start")(function* run(
  input: StartPublishInput
) {
  const service = yield* PublishService;

  return yield* service.startLogin(input.keyring, input.narrow);
}) satisfies Handle<typeof startPublish>;

export { handle };
