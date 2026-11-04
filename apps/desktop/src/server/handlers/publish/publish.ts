import { Effect } from "effect";

import type { Input } from "@design-studio/actions/_core/action";
import type { publishPublish } from "@design-studio/actions/publish/publish";
import {
  LinkedPublicationWriter,
  PublishPlanner,
} from "../../publish/index.js";
import type { Handle, Preview } from "../_core/handler.js";

type PublishPublishInput = Input<typeof publishPublish>;

const handle = Effect.fn("publish.publish")(function* run(
  input: PublishPublishInput
) {
  const writer = yield* LinkedPublicationWriter;

  return { publication: yield* writer.publish(input) };
}) satisfies Handle<typeof publishPublish>;

const preview = Effect.fn("publish.publish.preview")(function* card(
  input: PublishPublishInput
) {
  const planner = yield* PublishPlanner;

  return yield* planner.publishCard(input);
}) satisfies Preview<typeof publishPublish>;

export { handle, preview };
