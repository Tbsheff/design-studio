import { Forbidden } from "@design-studio/actions/_core/errors/forbidden";
import type { Permission } from "@design-studio/actions/_core/permissions";
import { Context, Effect, Layer, Option } from "effect";

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
      message: "Design Studio could not tell who made this call. Try again.",
      perm: needs,
    });
  }

  if (!isPermitted(found.value, needs)) {
    return yield* new Forbidden({
      message: `You do not have permission to do this (${needs}).`,
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
