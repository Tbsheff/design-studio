import { Context, Effect, Layer } from "effect";

import { Unauthenticated } from "@design-studio/actions/_core/errors/unauthenticated";
import { AuthGateway } from "../../auth/gateway.js";
import { CurrentOrg } from "../../tenant/current-org.js";
import type { CurrentOrgApi } from "../../tenant/current-org.js";
import { toAuthCalls } from "./auth-calls.js";
import type { KeyRecord } from "./auth-calls.js";
import { isApiKey, toBearer } from "./bearer.js";
import { CurrentKey } from "./current-key.js";
import type { CurrentKeyApi } from "./current-key.js";
import { MemberDirectory } from "./member-directory.js";
import { toKeyGrant, toOrgGrant } from "./org-grant.js";

interface AgentGrant {
  readonly key: CurrentKeyApi;
  readonly org: CurrentOrgApi;
}

interface AgentAuthApi {
  readonly authenticate: (
    request: Request
  ) => Effect.Effect<AgentGrant, Unauthenticated>;
}

const KEY_CONFIG = "mcp";

const toUnauthenticated = (): Unauthenticated =>
  new Unauthenticated({
    message: "The API key is not valid. Make a new key in Settings.",
  });

const isLive = (key: KeyRecord, now: number): boolean => {
  if (!key.enabled) {
    return false;
  }

  return key.expiresAt === null || key.expiresAt.getTime() > now;
};

class AgentAuth extends Context.Service<AgentAuth, AgentAuthApi>()(
  "design-studio/http/AgentAuth"
) {
  declare public readonly access: "read";

  public static readonly layer = Layer.effect(
    AgentAuth,
    Effect.gen(function* make() {
      const gateway = yield* AuthGateway;
      const directory = yield* MemberDirectory;
      const calls = toAuthCalls(gateway.api);

      const readKey = Effect.fn("AgentAuth.readKey")(function* run(
        request: Request
      ) {
        const token = toBearer(request);

        if (token === null || !isApiKey(token)) {
          return yield* toUnauthenticated();
        }

        const result = yield* Effect.tryPromise({
          catch: toUnauthenticated,
          try: () =>
            calls.verifyApiKey({ body: { configId: KEY_CONFIG, key: token } }),
        });

        if (!result.valid || result.key === null) {
          return yield* toUnauthenticated();
        }

        if (!isLive(result.key, Date.now())) {
          return yield* toUnauthenticated();
        }

        return result.key;
      });

      const authenticate = Effect.fn("AgentAuth.authenticate")(function* run(
        request: Request
      ) {
        const key = yield* readKey(request);
        const orgId = key.referenceId;
        const actingUserId = yield* directory.readActingUser(key.id, orgId);

        if (actingUserId === null) {
          return yield* toUnauthenticated();
        }

        const roleText = yield* directory.readRole(orgId, actingUserId);
        const grant = toOrgGrant(roleText);

        if (grant === null) {
          return yield* toUnauthenticated();
        }

        const effective = toKeyGrant(grant, key.permissions);

        return {
          key: { actingUserId, keyId: key.id, name: key.name ?? "" },
          org: {
            orgId,
            perms: effective.perms,
            role: effective.role,
            via: "key",
          },
        } satisfies AgentGrant;
      });

      return AgentAuth.of({ authenticate });
    })
  );
}

const withAgent =
  (request: Request) =>
  <Value, Failure, Needs>(
    handler: Effect.Effect<Value, Failure, Needs>
  ): Effect.Effect<
    Value,
    Failure | Unauthenticated,
    Exclude<Needs, CurrentKey | CurrentOrg> | AgentAuth
  > =>
    Effect.gen(function* run() {
      const auth = yield* AgentAuth;
      const grant = yield* auth.authenticate(request);

      return yield* handler.pipe(
        Effect.provideService(CurrentOrg, grant.org),
        Effect.provideService(CurrentKey, grant.key)
      );
    });

export { AgentAuth, withAgent };

export type { AgentAuthApi, AgentGrant };
