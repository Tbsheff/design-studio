import { Context, Effect, Layer } from "effect";

import type { ApprovalCard } from "../../shared/actions/_core/approval-card.js";
import { BadRequest } from "../../shared/actions/_core/errors/bad-request.js";
import { NotFound } from "../../shared/actions/_core/errors/not-found.js";
import type { PublishInput } from "../../shared/actions/publish/schema.js";
import type { Publication, PublishPlan } from "../../shared/publish.js";
import { attemptLegacy, planFor } from "./legacy-link.js";
import { toPublishCard, toRestoreCard, toUnpublishCard } from "./plan-card.js";
import { toPlanInput } from "./plan-input.js";

type PlanError = BadRequest | NotFound;

interface PublishPlannerApi {
  readonly plan: (input: PublishInput) => Effect.Effect<PublishPlan, PlanError>;
  readonly publishCard: (
    input: PublishInput
  ) => Effect.Effect<ApprovalCard, PlanError>;
  readonly restoreCard: (
    projectId: string,
    publicationId: string,
    versionId: string
  ) => Effect.Effect<ApprovalCard, PlanError>;
  readonly unpublishCard: (
    projectId: string,
    publicationId: string
  ) => Effect.Effect<ApprovalCard, PlanError>;
}

const findPublication = (
  projectId: string,
  publicationId: string
): Effect.Effect<Publication, PlanError> =>
  Effect.gen(function* find() {
    const list = yield* attemptLegacy((link) => link.service.list(projectId));
    const found = list.publications.find((item) => item.id === publicationId);

    if (!found) {
      return yield* new NotFound({
        message: `No publication ${publicationId}. Call list_publications.`,
      });
    }

    return found;
  });

const plan = Effect.fn("PublishPlanner.plan")(function* run(
  input: PublishInput
) {
  return yield* attemptLegacy(async (link) =>
    planFor(link, input.projectId, await toPlanInput(link, input))
  );
});

const makeApi = (): PublishPlannerApi => ({
  plan,
  publishCard: Effect.fn("PublishPlanner.publishCard")(function* run(
    input: PublishInput
  ) {
    return toPublishCard(yield* plan(input));
  }),
  restoreCard: Effect.fn("PublishPlanner.restoreCard")(function* run(
    projectId: string,
    publicationId: string,
    versionId: string
  ) {
    const found = yield* findPublication(projectId, publicationId);
    const version = found.versions.find((item) => item.id === versionId);

    if (!version) {
      return yield* new BadRequest({
        message: `Publication ${found.id} has no published version ${versionId}. Call list_publications for versions.`,
      });
    }

    return toRestoreCard(found, version);
  }),
  unpublishCard: Effect.fn("PublishPlanner.unpublishCard")(function* run(
    projectId: string,
    publicationId: string
  ) {
    return toUnpublishCard(yield* findPublication(projectId, publicationId));
  }),
});

class PublishPlanner extends Context.Service<
  PublishPlanner,
  PublishPlannerApi
>()("design-studio/publish/PublishPlanner") {
  declare public readonly access: "read";

  public static readonly layer = Layer.succeed(
    PublishPlanner,
    PublishPlanner.of(makeApi())
  );
}

export { PublishPlanner };

export type { PublishPlannerApi };
