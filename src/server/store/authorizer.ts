import { Context, Effect, Layer } from "effect";

import type { Forbidden } from "../../shared/actions/_core/errors/forbidden.js";
import type { Permission } from "../../shared/actions/_core/permissions.js";

interface AuthorizerApi {
  readonly require: (needs: Permission) => Effect.Effect<void, Forbidden>;
}

const requireLegacy = Effect.fn("Authorizer.require")(function* run(
  _needs: Permission
) {
  yield* Effect.void;
});

class Authorizer extends Context.Service<Authorizer, AuthorizerApi>()(
  "design-studio/store/Authorizer"
) {
  declare public readonly access: "read";

  public static readonly layer = Layer.succeed(
    Authorizer,
    Authorizer.of({ require: requireLegacy })
  );
}

export { Authorizer };

export type { AuthorizerApi };
