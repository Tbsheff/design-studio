import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { publishPublish } from "../../../shared/actions/publish/publish.js";
import { PublishPlanner, PublishService } from "../../publish/index.js";
import type { Handle, Preview } from "../_core/handler.js";

type PublishPublishInput = Input<typeof publishPublish>;

const handle = Effect.fn("publish.publish")(function* run(
  input: PublishPublishInput
) {
  const service = yield* PublishService;

  return { publication: yield* service.publish(input) };
}) satisfies Handle<typeof publishPublish>;

const preview = Effect.fn("publish.publish.preview")(function* card(
  input: PublishPublishInput
) {
  const planner = yield* PublishPlanner;

  return yield* planner.publishCard(input);
}) satisfies Preview<typeof publishPublish>;

export { handle, preview };
