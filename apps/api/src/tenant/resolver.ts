import { Context, Effect, Layer, Schema } from "effect";

import { Gone } from "@design-studio/actions/_core/errors/gone";
import { NotFound } from "@design-studio/actions/_core/errors/not-found";
import { CloudBindings } from "../platform/bindings.js";
import type { PublicScope, ShareScope } from "./viewer-scope.js";

const TOKEN_ROW_SQL =
  "SELECT org_id, share_id FROM share_token WHERE token_hash = ?1";

const SHARE_ROW_SQL =
  "SELECT org_id, id, project_id, direction_id, version_id, can_comment, expires_at, revoked_at FROM share WHERE org_id = ?1 AND id = ?2";

const SLUG_ROW_SQL =
  "SELECT org_id, publication_id FROM publication_slug WHERE slug = ?1";

const PUBLICATION_ROW_SQL =
  "SELECT org_id, id, project_id, live_version_id, expires_at, deleted_at FROM publication WHERE org_id = ?1 AND id = ?2";

const NullableString = Schema.NullOr(Schema.String);

const NullableNumber = Schema.NullOr(Schema.Number);

const TokenRowSchema = Schema.Struct({
  org_id: Schema.String,
  share_id: Schema.String,
});

const ShareRowSchema = Schema.Struct({
  can_comment: Schema.Number,
  direction_id: NullableString,
  expires_at: NullableNumber,
  id: Schema.String,
  org_id: Schema.String,
  project_id: Schema.String,
  revoked_at: NullableNumber,
  version_id: NullableString,
});

const SlugRowSchema = Schema.Struct({
  org_id: Schema.String,
  publication_id: Schema.String,
});

const PublicationRowSchema = Schema.Struct({
  deleted_at: NullableNumber,
  expires_at: NullableNumber,
  id: Schema.String,
  live_version_id: NullableString,
  org_id: Schema.String,
  project_id: Schema.String,
});

interface ResolverApi {
  readonly share: (token: string) => Effect.Effect<ShareScope, Gone | NotFound>;
  readonly slug: (slug: string) => Effect.Effect<PublicScope, Gone | NotFound>;
}

const HEX_RADIX = 16;

const toHex = (buffer: ArrayBuffer): string =>
  [...new Uint8Array(buffer)]
    .map((byte) => byte.toString(HEX_RADIX).padStart(2, "0"))
    .join("");

const hashToken = (token: string): Effect.Effect<string> =>
  Effect.promise(() =>
    crypto.subtle.digest("SHA-256", new TextEncoder().encode(token))
  ).pipe(Effect.map(toHex));

const isPast = (at: number | null, now: number): boolean =>
  at !== null && at <= now;

const makeResolver = (db: D1Database): ResolverApi => {
  const firstRow = Effect.fn("Resolver.firstRow")(function* run<Row>(
    sql: string,
    values: readonly string[],
    schema: Schema.Codec<Row, unknown>
  ) {
    const row = yield* Effect.promise(() =>
      db
        .prepare(sql)
        .bind(...values)
        .first()
    );

    if (row === null) {
      return yield* new NotFound({ message: "The link does not exist." });
    }

    return yield* Effect.orDie(Schema.decodeUnknownEffect(schema)(row));
  });

  return {
    share: Effect.fn("Resolver.share")(function* run(token) {
      const hash = yield* hashToken(token);
      const link = yield* firstRow(TOKEN_ROW_SQL, [hash], TokenRowSchema);

      const share = yield* firstRow(
        SHARE_ROW_SQL,
        [link.org_id, link.share_id],
        ShareRowSchema
      );

      const now = Date.now();

      if (share.revoked_at !== null || isPast(share.expires_at, now)) {
        return yield* new Gone({ message: "The share link is not active." });
      }

      return {
        canComment: share.can_comment === 1,
        directionId: share.direction_id,
        kind: "share",
        orgId: share.org_id,
        projectId: share.project_id,
        shareId: share.id,
        versionId: share.version_id,
      } satisfies ShareScope;
    }),
    slug: Effect.fn("Resolver.slug")(function* run(slug) {
      const link = yield* firstRow(SLUG_ROW_SQL, [slug], SlugRowSchema);

      const publication = yield* firstRow(
        PUBLICATION_ROW_SQL,
        [link.org_id, link.publication_id],
        PublicationRowSchema
      );

      const now = Date.now();

      if (
        publication.deleted_at !== null ||
        isPast(publication.expires_at, now)
      ) {
        return yield* new Gone({ message: "The publication is not live." });
      }

      return {
        kind: "public",
        liveVersionId: publication.live_version_id,
        orgId: publication.org_id,
        projectId: publication.project_id,
        publicationId: publication.id,
      } satisfies PublicScope;
    }),
  };
};

class Resolver extends Context.Service<Resolver, ResolverApi>()(
  "design-studio/tenant/Resolver"
) {
  declare public readonly access: "read";

  public static readonly layer = Layer.effect(
    Resolver,
    Effect.gen(function* make() {
      const bindings = yield* CloudBindings;

      return Resolver.of(makeResolver(bindings.db));
    })
  );
}

export { Resolver };

export type { ResolverApi };
