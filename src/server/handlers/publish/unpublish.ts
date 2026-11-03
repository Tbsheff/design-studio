import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { unpublishPublish } from "../../../shared/actions/publish/unpublish.js";
import {
  PublishPlanner,
  PublishService,
  findCloudOrg,
  isCloudId,
  unpublishFromCloud,
} from "../../publish/index.js";
import type { Handle, Preview } from "../_core/handler.js";

type UnpublishPublishInput = Input<typeof unpublishPublish>;

const handle = Effect.fn("publish.unpublish")(function* run(
  input: UnpublishPublishInput
) {
  const orgId = yield* findCloudOrg(input.projectId);

  if (orgId !== null && isCloudId(input.publicationId)) {
    return {
      publication: yield* unpublishFromCloud(
        orgId,
        input.projectId,
        input.publicationId
      ),
    };
  }

  const service = yield* PublishService;

  if (orgId !== null) {
    return {
      publication: yield* service.unpublishLocal(
        input.projectId,
        input.publicationId
      ),
    };
  }

  return {
    publication: yield* service.unpublish(input.projectId, input.publicationId),
  };
}) satisfies Handle<typeof unpublishPublish>;

const preview = Effect.fn("publish.unpublish.preview")(function* card(
  input: UnpublishPublishInput
) {
  const planner = yield* PublishPlanner;

  return yield* planner.unpublishCard(input.projectId, input.publicationId);
}) satisfies Preview<typeof unpublishPublish>;

export { handle, preview };
