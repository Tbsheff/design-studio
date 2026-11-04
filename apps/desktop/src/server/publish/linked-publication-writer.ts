import { Context, Effect, Layer } from "effect";

import type { CfFailed } from "@design-studio/actions/publish/errors/cf-failed";
import { isCloudId } from "@design-studio/actions/publish/schema";
import type { PublishInput } from "@design-studio/actions/publish/schema";
import type { Publication } from "../../shared/publish.js";
import { CloudLinkClient } from "../cloud/index.js";
import type { CloudFailure } from "../cloud/index.js";
import type { KnownFailure } from "../platform/attempt/index.js";
import { DeviceBindings } from "../store/index.js";
import { PublishService } from "./publish-service.js";

interface LinkedPublicationWriterApi {
  readonly publish: (
    input: PublishInput
  ) => Effect.Effect<Publication, CloudFailure | KnownFailure>;
  readonly unpublish: (
    projectId: string,
    publicationId: string
  ) => Effect.Effect<Publication, CfFailed | CloudFailure | KnownFailure>;
}

class LinkedPublicationWriter extends Context.Service<
  LinkedPublicationWriter,
  LinkedPublicationWriterApi
>()("design-studio/publish/LinkedPublicationWriter") {
  declare public readonly access: "write";

  public static readonly layer = Layer.effect(
    LinkedPublicationWriter,
    Effect.gen(function* make() {
      const bindings = yield* DeviceBindings;
      const cloud = yield* CloudLinkClient;
      const service = yield* PublishService;

      return LinkedPublicationWriter.of({
        publish: Effect.fn("LinkedPublicationWriter.publish")(function* run(
          input: PublishInput
        ) {
          const orgId = yield* bindings.getOrgOfProject(input.projectId);

          if (orgId === null) {
            return yield* service.publish(input);
          }

          return yield* cloud.publish(orgId, input);
        }),
        unpublish: Effect.fn("LinkedPublicationWriter.unpublish")(function* run(
          projectId: string,
          publicationId: string
        ) {
          const orgId = yield* bindings.getOrgOfProject(projectId);

          if (orgId === null) {
            return yield* service.unpublish(projectId, publicationId);
          }

          if (isCloudId(publicationId)) {
            return yield* cloud.unpublish(orgId, projectId, publicationId);
          }

          return yield* service.unpublishLocal(projectId, publicationId);
        }),
      });
    })
  );
}

export { LinkedPublicationWriter };

export type { LinkedPublicationWriterApi };
