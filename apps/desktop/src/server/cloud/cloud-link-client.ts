import type { Unauthenticated } from "@design-studio/actions/_core/errors/unauthenticated";
import type { Unavailable } from "@design-studio/actions/_core/errors/unavailable";
import { fromCloudId } from "@design-studio/actions/publish/schema";
import type { PublishInput } from "@design-studio/actions/publish/schema";
import type {
  ShareMade,
  ShareRevoked,
} from "@design-studio/actions/share/schema";
import { Context, Effect, Layer } from "effect";
import type { Schema } from "effect";

import type { Publication } from "../../shared/publish.js";
import { getJsonResponse } from "./cloud-fetch.js";
import {
  CloudPublicationSchema,
  CloudShareSchema,
  toCreatedShare,
  toProjectPath,
  toPublication,
  toRevokedShare,
} from "./cloud-link-rows.js";
import { CloudSession } from "./cloud-session.js";
import type { CloudSessionApi } from "./cloud-session.js";

type CloudFailure = Unauthenticated | Unavailable;

interface CloudShareInput {
  readonly directionId: string | null;
  readonly expiresAt: number;
  readonly projectId: string;
  readonly title: string | null;
  readonly versionId: string | null;
}

interface CloudLinkClientApi {
  readonly createShare: (
    orgId: string,
    input: CloudShareInput
  ) => Effect.Effect<ShareMade, CloudFailure>;
  readonly publish: (
    orgId: string,
    input: PublishInput
  ) => Effect.Effect<Publication, CloudFailure>;
  readonly revokeShare: (
    orgId: string,
    projectId: string,
    shareId: string
  ) => Effect.Effect<ShareRevoked, CloudFailure>;
  readonly unpublish: (
    orgId: string,
    projectId: string,
    publicationId: string
  ) => Effect.Effect<Publication, CloudFailure>;
}

interface LinkCall {
  readonly body: string | null;
  readonly method: "DELETE" | "POST";
  readonly path: string;
}

const JSON_HEADERS = { "content-type": "application/json" } as const;

const toPublishBody = (input: PublishInput): string =>
  JSON.stringify({
    directionId: input.directionId ?? null,
    hasPassword: (input.password ?? null) !== null,
    hasViewerComments: input.viewerComments ?? false,
    isNoindex: input.noindex ?? true,
    title: input.title ?? null,
    versionId: input.versionId ?? null,
  });

const toShareBody = (input: CloudShareInput): string =>
  JSON.stringify({
    directionId: input.directionId,
    expiresAt: input.expiresAt,
    title: input.title,
    versionId: input.versionId,
  });

const toItemPath = (base: string, kind: string, id: string): string =>
  `${base}/${kind}/${encodeURIComponent(fromCloudId(id))}`;

const toSend =
  (session: CloudSessionApi) =>
  <Value>(
    call: LinkCall,
    schema: Schema.Codec<Value, unknown>
  ): Effect.Effect<Value, CloudFailure> =>
    session.withToken((token) =>
      getJsonResponse(
        {
          body: call.body,
          headers: JSON_HEADERS,
          jwt: token,
          method: call.method,
          path: call.path,
        },
        schema
      )
    );

const toLinkClient = (session: CloudSessionApi): CloudLinkClientApi => {
  const send = toSend(session);

  return {
    createShare: Effect.fn("CloudLinkClient.createShare")(function* run(
      orgId: string,
      input: CloudShareInput
    ) {
      const path = `${toProjectPath(orgId, input.projectId)}/shares`;
      const call: LinkCall = { body: toShareBody(input), method: "POST", path };

      return toCreatedShare(yield* send(call, CloudShareSchema));
    }),
    publish: Effect.fn("CloudLinkClient.publish")(function* run(
      orgId: string,
      input: PublishInput
    ) {
      const path = `${toProjectPath(orgId, input.projectId)}/publications`;

      const call: LinkCall = {
        body: toPublishBody(input),
        method: "POST",
        path,
      };

      return toPublication(yield* send(call, CloudPublicationSchema));
    }),
    revokeShare: Effect.fn("CloudLinkClient.revokeShare")(function* run(
      orgId: string,
      projectId: string,
      shareId: string
    ) {
      const base = toProjectPath(orgId, projectId);
      const path = toItemPath(base, "shares", shareId);

      yield* send({ body: null, method: "DELETE", path }, CloudShareSchema);

      return toRevokedShare();
    }),
    unpublish: Effect.fn("CloudLinkClient.unpublish")(function* run(
      orgId: string,
      projectId: string,
      publicationId: string
    ) {
      const base = toProjectPath(orgId, projectId);
      const path = toItemPath(base, "publications", publicationId);
      const call: LinkCall = { body: null, method: "DELETE", path };
      const row = yield* send(call, CloudPublicationSchema);

      return { ...toPublication(row), status: "removed" as const };
    }),
  };
};

class CloudLinkClient extends Context.Service<
  CloudLinkClient,
  CloudLinkClientApi
>()("design-studio/cloud/CloudLinkClient") {
  declare public readonly access: "write";

  public static readonly layer = Layer.effect(
    CloudLinkClient,
    Effect.gen(function* make() {
      const session = yield* CloudSession;

      return CloudLinkClient.of(toLinkClient(session));
    })
  );
}

export { CloudLinkClient };

export type { CloudFailure, CloudLinkClientApi, CloudShareInput };
