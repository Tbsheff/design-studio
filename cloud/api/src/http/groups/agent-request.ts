import { Effect, Schema } from "effect";
import { HttpApiEndpoint, HttpApiGroup } from "effect/http-api";
import type { HttpApiBuilder } from "effect/http-api";

import { Forbidden } from "../../../../../src/shared/actions/_core/errors/forbidden.js";
import { CONFIRM_PERMISSIONS } from "../../../../../src/shared/actions/_core/permissions.js";
import type { Permission } from "../../../../../src/shared/actions/_core/permissions.js";
import { CurrentKey } from "../middleware/current-key.js";
import { CurrentUser } from "../middleware/current-user.js";
import { requireOrg, requirePerm } from "./authorizer.js";
import { AgentGate, MemberGate } from "./gates.js";
import { readAgentRequest, settleAgentRequest } from "./pending.js";
import { ROUTE_ERRORS } from "./wire-errors.js";

const AGENT_REQUEST_NEEDS = {
  confirm: "dynamic",
  get: "studio.read",
} as const satisfies Record<string, Permission | "dynamic">;

const RequestParams = {
  orgId: Schema.String,
  requestId: Schema.String,
};

const AgentRequestWireSchema = Schema.Struct({
  actionId: Schema.String,
  id: Schema.String,
  status: Schema.Literals(["approved", "denied", "pending"]),
});

const get = HttpApiEndpoint.get(
  "get",
  "/v1/o/:orgId/agent-requests/:requestId",
  {
    error: ROUTE_ERRORS,
    params: RequestParams,
    success: AgentRequestWireSchema,
  }
).middleware(AgentGate);

const confirm = HttpApiEndpoint.post(
  "confirm",
  "/v1/o/:orgId/agent-requests/:requestId/confirm",
  {
    error: ROUTE_ERRORS,
    params: RequestParams,
    payload: Schema.Struct({ decision: Schema.Literals(["approve", "deny"]) }),
    success: AgentRequestWireSchema,
  }
).middleware(MemberGate);

const AgentRequestGroup = HttpApiGroup.make("agent_request").add(get, confirm);

const isConfirmPermission = (needs: Permission): boolean =>
  (CONFIRM_PERMISSIONS as readonly string[]).includes(needs);

const toWire = (row: {
  readonly actionId: string;
  readonly id: string;
  readonly status: "approved" | "denied" | "pending";
}) => ({ actionId: row.actionId, id: row.id, status: row.status });

const agentRequestHandlers = (
  handlers: HttpApiBuilder.Handlers.FromGroup<typeof AgentRequestGroup>
) =>
  handlers
    .handle("get", ({ params }) =>
      Effect.gen(function* run() {
        yield* requireOrg(params.orgId);
        yield* requirePerm(AGENT_REQUEST_NEEDS.get);
        const key = yield* CurrentKey;
        const row = yield* readAgentRequest(params.requestId);

        if (row.keyId !== key.keyId) {
          return yield* new Forbidden({
            message: "This request belongs to another key.",
            perm: AGENT_REQUEST_NEEDS.get,
          });
        }

        return toWire(row);
      })
    )
    .handle("confirm", ({ params, payload }) =>
      Effect.gen(function* run() {
        yield* requireOrg(params.orgId);
        const user = yield* CurrentUser;
        const row = yield* readAgentRequest(params.requestId);

        if (!isConfirmPermission(row.needs)) {
          return yield* new Forbidden({
            message: "This request does not need a confirm.",
            perm: row.needs,
          });
        }

        yield* requirePerm(row.needs);

        return toWire(
          yield* settleAgentRequest({
            decision: payload.decision,
            requestId: params.requestId,
            userId: user.userId,
          })
        );
      })
    );

export { AGENT_REQUEST_NEEDS, AgentRequestGroup, agentRequestHandlers };
