import { Context, Effect, Layer, Option } from "effect";

import { Forbidden } from "../../shared/actions/_core/errors/forbidden.js";
import type { Permission } from "../../shared/actions/_core/permissions.js";
import { LocalPrincipal } from "./local-principal.js";
import { isPermitted } from "./principal.js";

interface AuthorizerApi {
  readonly require: (needs: Permission) => Effect.Effect<void, Forbidden>;
}

const requirePrincipal = Effect.fn("Authorizer.require")(function* run(
  needs: Permission
) {
  const found = yield* Effect.serviceOption(LocalPrincipal);

  if (Option.isNone(found)) {
    return yield* new Forbidden({
      message: "No principal for this call.",
      perm: needs,
    });
  }

  if (!isPermitted(found.value, needs)) {
    return yield* new Forbidden({
      message: `Missing permission ${needs}.`,
      perm: needs,
    });
  }
});

class Authorizer extends Context.Service<Authorizer, AuthorizerApi>()(
  "design-studio/store/Authorizer"
) {
  declare public readonly access: "read";

  public static readonly layer = Layer.succeed(
    Authorizer,
    Authorizer.of({ require: requirePrincipal })
  );
}

export { Authorizer };

export type { AuthorizerApi };
