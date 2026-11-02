import { Context, Effect, Layer } from "effect";

import type { Gone } from "../../../../../src/shared/actions/_core/errors/gone.js";
import type { NotFound } from "../../../../../src/shared/actions/_core/errors/not-found.js";
import { Resolver } from "../../tenant/resolver.js";
import { ViewerScope } from "../../tenant/viewer-scope.js";
import type { PublicScope, ShareScope } from "../../tenant/viewer-scope.js";

type ViewerAuthError = Gone | NotFound;

interface ViewerAuthApi {
  readonly readPublic: (
    slug: string
  ) => Effect.Effect<PublicScope, ViewerAuthError>;
  readonly readShare: (
    token: string
  ) => Effect.Effect<ShareScope, ViewerAuthError>;
}

class ViewerAuth extends Context.Service<ViewerAuth, ViewerAuthApi>()(
  "design-studio/http/ViewerAuth"
) {
  declare public readonly access: "read";

  public static readonly layer = Layer.effect(
    ViewerAuth,
    Effect.gen(function* make() {
      const resolver = yield* Resolver;

      const readShare = Effect.fn("ViewerAuth.readShare")(function* run(
        token: string
      ) {
        return yield* resolver.share(token);
      });

      const readPublic = Effect.fn("ViewerAuth.readPublic")(function* run(
        slug: string
      ) {
        return yield* resolver.slug(slug);
      });

      return ViewerAuth.of({ readPublic, readShare });
    })
  );
}

const withShare =
  (token: string) =>
  <Value, Failure, Needs>(
    handler: Effect.Effect<Value, Failure, Needs>
  ): Effect.Effect<
    Value,
    Failure | ViewerAuthError,
    Exclude<Needs, ViewerScope> | ViewerAuth
  > =>
    Effect.gen(function* run() {
      const auth = yield* ViewerAuth;
      const scope = yield* auth.readShare(token);

      return yield* Effect.provideService(handler, ViewerScope, scope);
    });

const withPublic =
  (slug: string) =>
  <Value, Failure, Needs>(
    handler: Effect.Effect<Value, Failure, Needs>
  ): Effect.Effect<
    Value,
    Failure | ViewerAuthError,
    Exclude<Needs, ViewerScope> | ViewerAuth
  > =>
    Effect.gen(function* run() {
      const auth = yield* ViewerAuth;
      const scope = yield* auth.readPublic(slug);

      return yield* Effect.provideService(handler, ViewerScope, scope);
    });

export { ViewerAuth, withPublic, withShare };

export type { ViewerAuthApi, ViewerAuthError };
