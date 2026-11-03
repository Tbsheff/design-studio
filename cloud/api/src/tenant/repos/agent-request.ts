import { Context, Effect, Layer, Schema } from "effect";

import type { CurrentOrg } from "../current-org.js";
import { TenantDb } from "../db.js";
import { tq } from "../sql.js";

const MS_PER_HOUR = 3_600_000;

const REQUEST_HOURS = 24;

const REQUEST_TTL_MS = REQUEST_HOURS * MS_PER_HOUR;

const AgentRequestRowSchema = Schema.Struct({
  created_at: Schema.Number,
  expires_at: Schema.Number,
  id: Schema.String,
  kind: Schema.String,
  org_id: Schema.String,
  project_id: Schema.NullOr(Schema.String),
  status: Schema.String,
});

type AgentRequestRow = typeof AgentRequestRowSchema.Type;

type AgentRequestKind = "publish" | "share";

interface AgentRequestCreate {
  readonly actingUserId: string;
  readonly keyId: string;
  readonly kind: AgentRequestKind;
  readonly payload: string;
  readonly projectId: string;
}

interface AgentRequestCreated {
  readonly expiresAt: number;
  readonly id: string;
}

const insertRequest = tq<{
  readonly actingUserId: string;
  readonly expiresAt: number;
  readonly id: string;
  readonly keyId: string;
  readonly kind: string;
  readonly now: number;
  readonly payload: string;
  readonly projectId: string;
}>`
  INSERT INTO agent_request (org_id, id, key_id, acting_user_id, project_id, kind, payload, status, created_at, expires_at)
  VALUES (:org, :id, :keyId, :actingUserId, :projectId, :kind, :payload, 'pending', :now, :expiresAt)
  RETURNING org_id`;

const byId = tq<{ readonly id: string }>`
  SELECT r.org_id, r.id, r.project_id, r.kind, r.status, r.created_at, r.expires_at
  FROM agent_request r
  WHERE r.org_id = :org AND r.id = :id`;

interface AgentRequestRepoApi {
  readonly create: (
    input: AgentRequestCreate
  ) => Effect.Effect<AgentRequestCreated, never, CurrentOrg>;
  readonly get: (
    id: string
  ) => Effect.Effect<AgentRequestRow, unknown, CurrentOrg>;
}

class AgentRequestRepo extends Context.Service<
  AgentRequestRepo,
  AgentRequestRepoApi
>()("design-studio/tenant/AgentRequestRepo") {
  declare public readonly access: "write";

  public static readonly layer = Layer.effect(
    AgentRequestRepo,
    Effect.gen(function* make() {
      const db = yield* TenantDb;

      const create = Effect.fn("AgentRequestRepo.create")(function* run(
        input: AgentRequestCreate
      ) {
        const id = crypto.randomUUID();
        const now = Date.now();
        const expiresAt = now + REQUEST_TTL_MS;

        yield* db.insert(insertRequest, { ...input, expiresAt, id, now });

        return { expiresAt, id };
      });

      return AgentRequestRepo.of({
        create,
        get: (id) => db.first(byId, { id }, AgentRequestRowSchema),
      });
    })
  );
}

export { AgentRequestRepo, REQUEST_TTL_MS };

export type {
  AgentRequestCreate,
  AgentRequestCreated,
  AgentRequestKind,
  AgentRequestRepoApi,
  AgentRequestRow,
};
