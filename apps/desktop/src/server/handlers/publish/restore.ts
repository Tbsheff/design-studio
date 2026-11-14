import type { Input } from "@design-studio/actions/_core/action";
import type { restorePublish } from "@design-studio/actions/publish/restore";
import { Effect } from "effect";

import { PublishPlanner, PublishService } from "../../publish/index.js";
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
