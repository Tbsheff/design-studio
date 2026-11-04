import { Effect, Layer } from "effect";
import { HttpServerRequest } from "effect/http";
import { HttpApiMiddleware } from "effect/http-api";

import { NotFound } from "../../shared-actions.js";
import { CurrentOrg } from "../../tenant/current-org.js";
import { MEMBER_ERRORS } from "../groups/wire-errors.js";
import { CurrentUser } from "../middleware/current-user.js";
import { MemberAuth } from "../middleware/member-auth.js";

const ORG_PATH = /\/v1\/o\/(?<org>[^/?]+)/u;

const toOrgId = (url: string): string | null =>
  ORG_PATH.exec(url)?.groups?.org ?? null;

class SyncGate extends HttpApiMiddleware.Service<
  SyncGate,
  { provides: CurrentOrg | CurrentUser }
>()("design-studio/http/SyncGate", { error: MEMBER_ERRORS }) {}

const SyncGateLive = Layer.effect(
  SyncGate,
  Effect.gen(function* make() {
    const auth = yield* MemberAuth;

    return SyncGate.of((httpEffect) =>
      Effect.gen(function* run() {
        const request = yield* HttpServerRequest.HttpServerRequest;
        const web = yield* HttpServerRequest.toWeb(request).pipe(Effect.orDie);
        const orgId = toOrgId(request.url);

        if (orgId === null) {
          return yield* new NotFound({
            message: "The organization does not exist.",
          });
        }

        const grant = yield* auth.authenticate({
          orgId,
          request: web,
          route: "device",
        });

        return yield* httpEffect.pipe(
          Effect.provideService(CurrentOrg, grant.org),
          Effect.provideService(CurrentUser, grant.user)
        );
      })
    );
  })
);

export { SyncGate, SyncGateLive };
