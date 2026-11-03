import { Effect, Layer } from "effect";
import { HttpServerRequest } from "effect/http";
import { HttpApiMiddleware } from "effect/http-api";

import { NotFound } from "../../../../../src/shared/actions/_core/errors/not-found.js";
import { CurrentOrg } from "../../tenant/current-org.js";
import { ViewerScope } from "../../tenant/viewer-scope.js";
import { AgentAuth } from "../middleware/agent-auth.js";
import type { AgentAuthApi } from "../middleware/agent-auth.js";
import { CurrentKey } from "../middleware/current-key.js";
import { CurrentUser } from "../middleware/current-user.js";
import { MemberAuth } from "../middleware/member-auth.js";
import type { RouteClass } from "../middleware/member-auth.js";
import { ViewerAuth } from "../middleware/viewer.js";
import {
  MEMBER_ERRORS,
  NotFoundWire,
  UnauthenticatedWire,
} from "./wire-errors.js";

const ORG_PATH = /\/v1\/o\/(?<org>[^/?]+)/u;

const toOrgId = (url: string): string | null => {
  const match = ORG_PATH.exec(url);

  if (match === null) {
    return null;
  }

  return match.groups?.org ?? null;
};

const toRouteClass = (method: string): RouteClass => {
  if (method === "DELETE") {
    return "admin";
  }

  return "web";
};

const toMissingOrg = (): NotFound =>
  new NotFound({ message: "The organization does not exist." });

class MemberGate extends HttpApiMiddleware.Service<
  MemberGate,
  { provides: CurrentOrg | CurrentUser }
>()("design-studio/http/MemberGate", { error: MEMBER_ERRORS }) {}

class AgentGate extends HttpApiMiddleware.Service<
  AgentGate,
  { provides: CurrentKey | CurrentOrg }
>()("design-studio/http/AgentGate", {
  error: [NotFoundWire, UnauthenticatedWire],
}) {}

class AgentProbeGate extends HttpApiMiddleware.Service<
  AgentProbeGate,
  { provides: CurrentKey | CurrentOrg }
>()("design-studio/http/AgentProbeGate", { error: [NotFoundWire] }) {}

class ViewerGate extends HttpApiMiddleware.Service<
  ViewerGate,
  { provides: ViewerScope }
>()("design-studio/http/ViewerGate", { error: [NotFoundWire] }) {}

const readWebRequest = Effect.fn("Gate.readWebRequest")(function* run() {
  const request = yield* HttpServerRequest.HttpServerRequest;
  const web = yield* HttpServerRequest.toWeb(request).pipe(Effect.orDie);

  return { orgId: toOrgId(request.url), request: web };
});

const MemberGateLive = Layer.effect(
  MemberGate,
  Effect.gen(function* make() {
    const auth = yield* MemberAuth;

    return MemberGate.of((httpEffect, { endpoint }) =>
      Effect.gen(function* run() {
        const input = yield* readWebRequest();

        if (input.orgId === null) {
          return yield* toMissingOrg();
        }

        const grant = yield* auth.authenticate({
          orgId: input.orgId,
          request: input.request,
          route: toRouteClass(endpoint.method),
        });

        return yield* httpEffect.pipe(
          Effect.provideService(CurrentOrg, grant.org),
          Effect.provideService(CurrentUser, grant.user)
        );
      })
    );
  })
);

const authenticateAgent = Effect.fn("Gate.authenticateAgent")(function* run(
  auth: AgentAuthApi
) {
  const input = yield* readWebRequest();
  const grant = yield* auth.authenticate(input.request);

  if (grant.org.orgId !== input.orgId) {
    return yield* toMissingOrg();
  }

  return grant;
});

const AgentGateLive = Layer.effect(
  AgentGate,
  Effect.gen(function* make() {
    const auth = yield* AgentAuth;

    return AgentGate.of((httpEffect) =>
      Effect.gen(function* run() {
        const grant = yield* authenticateAgent(auth);

        return yield* httpEffect.pipe(
          Effect.provideService(CurrentOrg, grant.org),
          Effect.provideService(CurrentKey, grant.key)
        );
      })
    );
  })
);

const AgentProbeGateLive = Layer.effect(
  AgentProbeGate,
  Effect.gen(function* make() {
    const auth = yield* AgentAuth;

    return AgentProbeGate.of((httpEffect) =>
      Effect.gen(function* run() {
        const grant = yield* authenticateAgent(auth).pipe(
          Effect.mapError(toMissingOrg)
        );

        return yield* httpEffect.pipe(
          Effect.provideService(CurrentOrg, grant.org),
          Effect.provideService(CurrentKey, grant.key)
        );
      })
    );
  })
);

const ViewerGateLive = Layer.effect(
  ViewerGate,
  Effect.gen(function* make() {
    const auth = yield* ViewerAuth;

    return ViewerGate.of((httpEffect) =>
      Effect.gen(function* run() {
        const request = yield* HttpServerRequest.HttpServerRequest;
        const token = request.url.split("/share/")[1]?.split("/")[0] ?? "";

        const scope = yield* auth
          .readShare(token)
          .pipe(Effect.mapError(toMissingOrg));

        return yield* Effect.provideService(httpEffect, ViewerScope, scope);
      })
    );
  })
);

const GatesLive = Layer.mergeAll(
  MemberGateLive,
  AgentGateLive,
  AgentProbeGateLive,
  ViewerGateLive
);

export {
  AgentGate,
  AgentGateLive,
  AgentProbeGate,
  AgentProbeGateLive,
  GatesLive,
  MemberGate,
  MemberGateLive,
  ViewerGate,
  ViewerGateLive,
};
