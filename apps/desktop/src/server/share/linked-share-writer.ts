import { isCloudId } from "@design-studio/actions/publish/schema";
import type {
  ShareCreated,
  ShareRevoked,
} from "@design-studio/actions/share/schema";
import { Context, Effect, Layer } from "effect";

import { CloudLinkClient } from "../cloud/index.js";
import type { CloudFailure, CloudShareInput } from "../cloud/index.js";
import { DeviceBindings } from "../store/index.js";
import type { ShareError } from "./share-attempt.js";
import { ShareLinkStore } from "./share-link-store.js";
import type { CreateRequest } from "./share-links.js";

const HOUR_MS = 3_600_000;

const DEFAULT_SHARE_HOURS = 72;

interface LinkedShareWriterApi {
  readonly create: (
    input: CreateRequest
  ) => Effect.Effect<ShareCreated, CloudFailure | ShareError>;
  readonly delete: (
    projectId: string,
    shareId: string
  ) => Effect.Effect<ShareRevoked, CloudFailure | ShareError>;
}

const toCloudShare = (input: CreateRequest, now: number): CloudShareInput => ({
  directionId: input.directionId ?? null,
  expiresAt: now + (input.expiresInHours ?? DEFAULT_SHARE_HOURS) * HOUR_MS,
  projectId: input.projectId,
  title: input.title ?? null,
  versionId: input.versionId ?? null,
});

class LinkedShareWriter extends Context.Service<
  LinkedShareWriter,
  LinkedShareWriterApi
>()("design-studio/share/LinkedShareWriter") {
  declare public readonly access: "write";

  public static readonly layer = Layer.effect(
    LinkedShareWriter,
    Effect.gen(function* make() {
      const bindings = yield* DeviceBindings;
      const cloud = yield* CloudLinkClient;
      const links = yield* ShareLinkStore;

      return LinkedShareWriter.of({
        create: Effect.fn("LinkedShareWriter.create")(function* run(
          input: CreateRequest
        ) {
          const orgId = yield* bindings.getOrgOfProject(input.projectId);

          if (orgId === null) {
            return yield* links.create(input);
          }

          return yield* cloud.createShare(
            orgId,
            toCloudShare(input, Date.now())
          );
        }),
        delete: Effect.fn("LinkedShareWriter.delete")(function* run(
          projectId: string,
          shareId: string
        ) {
          const orgId = yield* bindings.getOrgOfProject(projectId);

          if (orgId === null || !isCloudId(shareId)) {
            return yield* links.revoke(projectId, shareId);
          }

          return yield* cloud.revokeShare(orgId, projectId, shareId);
        }),
      });
    })
  );
}

export { LinkedShareWriter };

export type { LinkedShareWriterApi };
