import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { restorePublish } from "../../../shared/actions/publish/restore.js";
import { PublishService } from "../../publish/publications.js";
import { PublishPlanner } from "../../publish/publish-planner.js";
import type { Handle, Preview } from "../_core/handler.js";

type RestorePublishInput = Input<typeof restorePublish>;

const handle = Effect.fn("publish.restore")(function* run(
  input: RestorePublishInput
) {
  const service = yield* PublishService;

  return {
    publication: yield* service.rollback(
      input.projectId,
      input.publicationId,
      input.versionId
    ),
  };
}) satisfies Handle<typeof restorePublish>;

const preview = Effect.fn("publish.restore.preview")(function* card(
  input: RestorePublishInput
) {
  const planner = yield* PublishPlanner;

  return yield* planner.restoreCard(
    input.projectId,
    input.publicationId,
    input.versionId
  );
}) satisfies Preview<typeof restorePublish>;

export { handle, preview };
