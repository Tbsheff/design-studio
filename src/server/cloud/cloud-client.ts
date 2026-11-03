import { Context, Effect, Layer, Schema } from "effect";

import type { Unauthenticated } from "../../shared/actions/_core/errors/unauthenticated.js";
import type { Unavailable } from "../../shared/actions/_core/errors/unavailable.js";
import {
  CloudOrgSchema,
  CloudUserSchema,
} from "../../shared/actions/cloud/schema.js";
import { getJsonResponse } from "./cloud-fetch.js";
import { CloudSession } from "./cloud-session.js";
import type { CloudProfile } from "./cloud-session.js";

const OrgListSchema = Schema.Array(CloudOrgSchema);

interface SyncChange {
  readonly id: string;
  readonly op: "delete" | "insert" | "update";
  readonly rowId: string;
  readonly rowRev: number;
  readonly tableName: string;
}

interface SyncTarget {
  readonly orgId: string;
  readonly projectId: string;
  readonly signature: string;
}

interface PushRequest extends SyncTarget {
  readonly changes: readonly SyncChange[];
  readonly rev: number;
}

interface PullRequest extends SyncTarget {
  readonly after: number;
  readonly limit: number;
}

interface CloudClientApi {
  readonly pull: (
    request: PullRequest
  ) => Effect.Effect<
    typeof PullResultSchema.Type,
    Unauthenticated | Unavailable,
    CloudSession
  >;
  readonly push: (
    request: PushRequest
  ) => Effect.Effect<
    typeof PushResultSchema.Type,
    Unauthenticated | Unavailable,
    CloudSession
  >;
  readonly profile: () => Effect.Effect<
    CloudProfile,
    Unauthenticated | Unavailable,
    CloudSession
  >;
}

const PushResultSchema = Schema.Struct({ rev: Schema.Number });

const PullResultSchema = Schema.Struct({
  cursor: Schema.NullOr(Schema.Number),
  items: Schema.Array(
    Schema.Struct({
      created_at: Schema.Number,
      id: Schema.String,
      op: Schema.String,
      row_id: Schema.String,
      row_rev: Schema.Number,
      seq: Schema.Number,
      table_name: Schema.String,
    })
  ),
});

const toSyncPath = (target: SyncTarget, leaf: string): string =>
  `/v1/o/${encodeURIComponent(target.orgId)}/projects/${encodeURIComponent(target.projectId)}/sync/${leaf}`;

const getJson = <Value>(
  path: string,
  token: string,
  schema: Schema.Codec<Value, unknown>
): Effect.Effect<Value, Unavailable> =>
  getJsonResponse(
    { body: null, headers: {}, jwt: token, method: "GET", path },
    schema
  );

class CloudClient extends Context.Service<CloudClient, CloudClientApi>()(
  "design-studio/cloud/CloudClient"
) {
  declare public readonly access: "read";

  public static readonly layer = Layer.succeed(
    CloudClient,
    CloudClient.of({
      profile: Effect.fn("CloudClient.profile")(function* run() {
        const session = yield* CloudSession;

        return yield* session.withToken((jwt) =>
          Effect.all({
            orgs: getJson("/v1/orgs", jwt, OrgListSchema),
            user: getJson("/v1/me", jwt, CloudUserSchema),
          })
        );
      }),
      pull: Effect.fn("CloudClient.pull")(function* run(request: PullRequest) {
        const session = yield* CloudSession;

        return yield* session.withToken((token) =>
          getJsonResponse(
            {
              body: null,
              headers: { "x-cloud-ref": request.signature },
              jwt: token,
              method: "GET",
              path: `${toSyncPath(request, "pull")}?after=${request.after}&limit=${request.limit}`,
            },
            PullResultSchema
          )
        );
      }),
      push: Effect.fn("CloudClient.push")(function* run(request: PushRequest) {
        const session = yield* CloudSession;

        return yield* session.withToken((token) =>
          getJsonResponse(
            {
              body: JSON.stringify({
                changes: request.changes,
                rev: request.rev,
              }),
              headers: {
                "content-type": "application/json",
                "x-cloud-ref": request.signature,
              },
              jwt: token,
              method: "POST",
              path: toSyncPath(request, "push"),
            },
            PushResultSchema
          )
        );
      }),
    })
  );
}

export { CloudClient };

export type {
  CloudClientApi,
  PullRequest,
  PushRequest,
  SyncChange,
  SyncTarget,
};
