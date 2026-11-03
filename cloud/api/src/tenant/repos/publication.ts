import { Context, Effect, Layer, Schema } from "effect";

import { CloudBindings } from "../../platform/bindings.js";
import { NotFound } from "../../shared-actions.js";
import { RowOrgMismatch } from "../errors/row-org-mismatch.js";
import { tq } from "../sql.js";
import type { PublicScope } from "../viewer-scope.js";

const PublishedFileSchema = Schema.Struct({
  blob_id: Schema.String,
  content_type: Schema.String,
  has_password: Schema.Number,
  org_id: Schema.String,
  path: Schema.String,
  size: Schema.Number,
});

type PublishedFile = typeof PublishedFileSchema.Type;

const publishedFile = tq<{
  readonly path: string;
  readonly publicationId: string;
  readonly versionId: string;
}>`
  SELECT f.org_id, f.path, f.blob_id, f.content_type, f.size,
    CASE WHEN p.password_hash IS NULL THEN 0 ELSE 1 END AS has_password
  FROM publication_file f
  JOIN publication_version v ON v.org_id = f.org_id AND v.id = f.publication_version_id
  JOIN publication p ON p.org_id = v.org_id AND p.id = v.publication_id
  WHERE f.org_id = :org AND f.publication_version_id = :versionId AND f.path = :path
    AND v.publication_id = :publicationId AND v.committed_at IS NOT NULL AND p.deleted_at IS NULL`;

interface PublicationRepoApi {
  readonly readFile: (
    scope: PublicScope,
    path: string
  ) => Effect.Effect<PublishedFile, NotFound>;
}

const makePublicationRepo = (db: D1Database): PublicationRepoApi => ({
  readFile: Effect.fn("PublicationRepo.readFile")(function* run(scope, path) {
    if (scope.liveVersionId === null) {
      return yield* new NotFound({ message: "The file does not exist." });
    }

    const bound = publishedFile.bind(scope.orgId, {
      path,
      publicationId: scope.publicationId,
      versionId: scope.liveVersionId,
    });

    const row = yield* Effect.promise(() =>
      db
        .prepare(publishedFile.sql)
        .bind(...bound)
        .first()
    );

    if (row === null) {
      return yield* new NotFound({ message: "The file does not exist." });
    }

    const file = yield* Effect.orDie(
      Schema.decodeUnknownEffect(PublishedFileSchema)(row)
    );

    if (file.org_id !== scope.orgId) {
      return yield* Effect.die(
        new RowOrgMismatch({
          message: "a row has the wrong org_id",
          statement: publishedFile.sql,
        })
      );
    }

    return file;
  }),
});

class PublicationRepo extends Context.Service<
  PublicationRepo,
  PublicationRepoApi
>()("design-studio/tenant/PublicationRepo") {
  declare public readonly access: "read";

  public static readonly layer = Layer.effect(
    PublicationRepo,
    Effect.gen(function* make() {
      const bindings = yield* CloudBindings;

      return PublicationRepo.of(makePublicationRepo(bindings.db));
    })
  );
}

export { PublicationRepo };

export type { PublicationRepoApi, PublishedFile };
