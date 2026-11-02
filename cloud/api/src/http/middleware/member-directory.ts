import { Context, Effect, Layer } from "effect";

import { toMemberRoles } from "../../auth/member-roles.js";
import { CloudBindings } from "../../platform/bindings.js";

interface MemberDirectoryApi {
  readonly readActingUser: (
    keyId: string,
    orgId: string
  ) => Effect.Effect<string | null>;
  readonly readRole: (
    orgId: string,
    userId: string
  ) => Effect.Effect<string | null>;
}

class MemberDirectory extends Context.Service<
  MemberDirectory,
  MemberDirectoryApi
>()("design-studio/http/MemberDirectory") {
  declare public readonly access: "read";

  public static readonly layer = Layer.effect(
    MemberDirectory,
    Effect.gen(function* make() {
      const bindings = yield* CloudBindings;
      const roles = toMemberRoles(bindings.db);

      const readActingUser = Effect.fn("MemberDirectory.readActingUser")(
        function* run(keyId: string, orgId: string) {
          return yield* Effect.promise(() =>
            roles.readActingUser(keyId, orgId)
          );
        }
      );

      const readRole = Effect.fn("MemberDirectory.readRole")(function* run(
        orgId: string,
        userId: string
      ) {
        return yield* Effect.promise(() => roles.readRole(orgId, userId));
      });

      return MemberDirectory.of({ readActingUser, readRole });
    })
  );
}

export { MemberDirectory };

export type { MemberDirectoryApi };
