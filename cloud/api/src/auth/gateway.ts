import { betterAuth } from "better-auth";
import { Context, Effect, Layer } from "effect";

import { CloudBindings } from "../platform/bindings.js";
import { CloudSettings } from "../platform/env.js";
import { toMemberRoles } from "./member-roles.js";
import type { MemberRoles } from "./member-roles.js";
import { toAuthOptions } from "./options.js";
import type { VerifiedUser } from "./options.js";
import { toRateClient } from "./rate-limit.js";

type AuthInstance = ReturnType<typeof betterAuth>;

interface AuthGatewayApi {
  readonly api: AuthInstance["api"];
  readonly handle: (request: Request) => Effect.Effect<Response>;
}

const toPersonalOrg =
  (members: MemberRoles) =>
  async (user: VerifiedUser): Promise<void> => {
    if (!user.emailVerified) {
      return;
    }

    await members.createPersonalOrg(user);
  };

class AuthGateway extends Context.Service<AuthGateway, AuthGatewayApi>()(
  "design-studio/auth/AuthGateway"
) {
  declare public readonly access: "write";

  public static readonly layer = Layer.effect(
    AuthGateway,
    Effect.gen(function* make() {
      const bindings = yield* CloudBindings;
      const cloudSettings = yield* CloudSettings;
      const memberRoles = toMemberRoles(bindings.db);

      const auth = betterAuth(
        toAuthOptions({
          database: bindings.db,
          members: memberRoles,
          onVerified: toPersonalOrg(memberRoles),
          rate: toRateClient(bindings.rate),
          settings: cloudSettings,
        })
      );

      const handle = Effect.fn("AuthGateway.handle")(function* run(
        request: Request
      ) {
        return yield* Effect.promise(() => auth.handler(request));
      });

      return AuthGateway.of({ api: auth.api, handle });
    })
  );
}

export { AuthGateway };

export type { AuthGatewayApi, AuthInstance };
