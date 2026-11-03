import { Effect, Schema } from "effect";
import { HttpApiEndpoint, HttpApiGroup } from "effect/http-api";
import type { HttpApiBuilder } from "effect/http-api";

import type { Permission } from "../../../../../src/shared/actions/_core/permissions.js";
import { CurrentOrg } from "../../tenant/current-org.js";
import { CurrentKey } from "../middleware/current-key.js";
import { requireOrg, requirePerm } from "./authorizer.js";
import { AgentProbeGate, MemberGate } from "./gates.js";
import { listKeys, removeKey } from "./pending.js";
import { NotFoundWire, ROUTE_ERRORS } from "./wire-errors.js";

const KEY_NEEDS = {
  delete: "apiKey.revoke",
  introspect: null,
  list: "studio.read",
} as const satisfies Record<string, Permission | null>;

const OrgParams = { orgId: Schema.String };

const KeyWireSchema = Schema.Struct({
  actingUserId: Schema.String,
  id: Schema.String,
  name: Schema.String,
});

const IntrospectWireSchema = Schema.Struct({
  actingUserId: Schema.String,
  keyId: Schema.String,
  name: Schema.String,
  orgId: Schema.String,
  perms: Schema.Array(Schema.String),
  role: Schema.String,
});

const list = HttpApiEndpoint.get("list", "/v1/o/:orgId/keys", {
  error: ROUTE_ERRORS,
  params: OrgParams,
  success: Schema.Struct({ items: Schema.Array(KeyWireSchema) }),
}).middleware(MemberGate);

const remove = HttpApiEndpoint.delete("delete", "/v1/o/:orgId/keys/:keyId", {
  error: ROUTE_ERRORS,
  params: { ...OrgParams, keyId: Schema.String },
  success: Schema.Struct({ ok: Schema.Boolean }),
}).middleware(MemberGate);

const introspect = HttpApiEndpoint.get(
  "introspect",
  "/v1/o/:orgId/keys/introspect",
  {
    error: [NotFoundWire],
    params: OrgParams,
    success: IntrospectWireSchema,
  }
).middleware(AgentProbeGate);

const KeysGroup = HttpApiGroup.make("keys").add(list, remove, introspect);

const keysHandlers = (
  handlers: HttpApiBuilder.Handlers.FromGroup<typeof KeysGroup>
) =>
  handlers
    .handle("list", ({ params }) =>
      Effect.gen(function* run() {
        yield* requireOrg(params.orgId);
        yield* requirePerm(KEY_NEEDS.list);

        return { items: yield* listKeys() };
      })
    )
    .handle("delete", ({ params }) =>
      Effect.gen(function* run() {
        yield* requireOrg(params.orgId);
        yield* requirePerm(KEY_NEEDS.delete);
        yield* removeKey(params.keyId);

        return { ok: true };
      })
    )
    .handle("introspect", ({ params }) =>
      Effect.gen(function* run() {
        const org = yield* requireOrg(params.orgId);
        const key = yield* CurrentKey;
        const current = yield* CurrentOrg;

        return {
          actingUserId: key.actingUserId,
          keyId: key.keyId,
          name: key.name,
          orgId: org.orgId,
          perms: current.perms,
          role: current.role,
        };
      })
    );

export { KEY_NEEDS, KeysGroup, keysHandlers };
