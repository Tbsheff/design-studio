import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { unpublishPublish } from "../../../shared/actions/publish/unpublish.js";
import {
  LinkedPublicationWriter,
  PublishPlanner,
} from "../../publish/index.js";
import type { Handle, Preview } from "../_core/handler.js";

type UnpublishPublishInput = Input<typeof unpublishPublish>;

const handle = Effect.fn("publish.unpublish")(function* run(
  input: UnpublishPublishInput
) {
  const writer = yield* LinkedPublicationWriter;

  return {
    publication: yield* writer.unpublish(input.projectId, input.publicationId),
  };
}) satisfies Handle<typeof unpublishPublish>;

const preview = Effect.fn("publish.unpublish.preview")(function* card(
  input: UnpublishPublishInput
) {
  const planner = yield* PublishPlanner;

  return yield* planner.unpublishCard(input.projectId, input.publicationId);
}) satisfies Preview<typeof unpublishPublish>;

export { handle, preview };
