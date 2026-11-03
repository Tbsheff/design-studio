import { HttpApiGroup } from "effect/http-api";

type AuthKind = "agent" | "member" | "public" | "viewer";

interface TaggedGroup {
  readonly annotations?: {
    readonly mapUnsafe?: ReadonlyMap<string, AuthKind>;
  };
}

const AUTH_KIND_KEY = "studio.authKind";

const makeGroup = <const Id extends string>(
  id: Id,
  authKind: AuthKind
): HttpApiGroup.HttpApiGroup<Id> =>
  (HttpApiGroup.make(id) as HttpApiGroup.HttpApiGroup<Id>).annotate(
    { key: AUTH_KIND_KEY } as never,
    authKind as never
  );

const toAuthKind = (group: TaggedGroup): AuthKind | null =>
  group.annotations?.mapUnsafe?.get(AUTH_KIND_KEY) ?? null;

export { AUTH_KIND_KEY, makeGroup, toAuthKind };

export type { AuthKind, TaggedGroup };
