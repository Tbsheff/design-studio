import { Effect, Schema } from "effect";
import { HttpApiEndpoint, HttpApiGroup } from "effect/http-api";
import type { HttpApiBuilder } from "effect/http-api";

import { AuthRateLimit, AUTH_RULES } from "../../auth/rate-limit.js";
import { CurrentOrg } from "../../tenant/current-org.js";
import { KeyPermRepo } from "../../tenant/repos/key-perm.js";
import { CurrentUser } from "../middleware/current-user.js";
import { ORG_PATH, OrgIdSchema, OrgParams } from "../org-params.js";
import { requireOrg, requirePerm } from "./authorizer.js";
import { MemberGate } from "./gates.js";
import { createKey } from "./keys/create-key.js";
import { MEMBER_ERRORS, NotFoundWire } from "./wire-errors.js";

const KEY_NEEDS = {
  create: "apiKey.create",
  introspect: "apiKey.create",
  list: "apiKey.create",
  revoke: "apiKey.revoke",
} as const;

const KeyParams = { ...OrgParams, keyId: Schema.String };

const KeyWireSchema = Schema.Struct({
  actingUserId: Schema.String,
  createdAt: Schema.Number,
  keyId: Schema.String,
  name: Schema.String,
  orgId: OrgIdSchema,
  perms: Schema.Array(Schema.String),
  revoked: Schema.Boolean,
});

const errors = [...MEMBER_ERRORS, NotFoundWire];

const list = HttpApiEndpoint.get("list", `${ORG_PATH}/keys`, {
  error: errors,
  params: OrgParams,
  success: Schema.Struct({ items: Schema.Array(KeyWireSchema) }),
});

const introspect = HttpApiEndpoint.get(
  "introspect",
  `${ORG_PATH}/keys/:keyId/introspect`,
  { error: errors, params: KeyParams, success: KeyWireSchema }
);

const create = HttpApiEndpoint.post("create", `${ORG_PATH}/keys`, {
  error: errors,
  params: OrgParams,
  payload: Schema.Struct({
    name: Schema.String,
    perms: Schema.Array(Schema.String),
  }),
  success: Schema.Struct({ key: Schema.String, keyId: Schema.String }),
});

const revoke = HttpApiEndpoint.delete("revoke", `${ORG_PATH}/keys/:keyId`, {
  error: errors,
  params: KeyParams,
  success: Schema.Struct({ ok: Schema.Boolean }),
});

const KeysGroup = HttpApiGroup.make("keys")
  .add(list, introspect, create, revoke)
  .middleware(MemberGate);

const checkRate = Effect.fn("KeysGroup.checkRate")(function* run() {
  const org = yield* CurrentOrg;
  const limiter = yield* AuthRateLimit;
  yield* limiter
    .check(`keys:${org.orgId}`, AUTH_RULES.apiKey)
    .pipe(Effect.orDie);
});

const keysHandlers = (
  handlers: HttpApiBuilder.Handlers.FromGroup<typeof KeysGroup>
) =>
  Effect.gen(function* make() {
    const repo = yield* KeyPermRepo;

    return handlers
      .handle("list", ({ params }) =>
        Effect.gen(function* run() {
          yield* requireOrg(params.orgId);
          yield* requirePerm(KEY_NEEDS.list);

          return { items: yield* repo.list() };
        })
      )
      .handle("introspect", ({ params }) =>
        Effect.gen(function* run() {
          yield* requireOrg(params.orgId);
          yield* requirePerm(KEY_NEEDS.introspect);
          yield* checkRate();

          return yield* repo.introspect(params.keyId);
        })
      )
      .handle("create", ({ params, payload }) =>
        Effect.gen(function* run() {
          yield* requireOrg(params.orgId);
          yield* requirePerm(KEY_NEEDS.create);
          const user = yield* CurrentUser;

          return yield* createKey({
            name: payload.name,
            orgId: params.orgId,
            perms: payload.perms,
            userId: user.userId,
          });
        })
      )
      .handle("revoke", ({ params }) =>
        Effect.gen(function* run() {
          yield* requireOrg(params.orgId);
          yield* requirePerm(KEY_NEEDS.revoke);
          yield* repo.revoke(params.keyId);

          return { ok: true };
        })
      );
  });

export { KEY_NEEDS, KeysGroup, keysHandlers };
