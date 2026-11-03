import { Context, Effect, Layer, Schema } from "effect";

import { CloudBindings } from "../platform/bindings.js";
import { NotFound } from "../shared-actions.js";
import type { RowSchema } from "./db.js";
import {
  RowOrgMismatch,
  WRONG_ORG_MESSAGE,
} from "./errors/row-org-mismatch.js";
import { tq } from "./sql.js";
import type { BoundValue } from "./sql.js";
import { ViewerScope } from "./viewer-scope.js";

const PROJECT_MISSING = "The project does not exist.";

const FILE_MISSING = "The file does not exist.";

const ViewedProjectSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  org_id: Schema.String,
});

type ViewedProject = typeof ViewedProjectSchema.Type;

const PublishedFileRowSchema = Schema.Struct({
  blob_id: Schema.String,
  content_type: Schema.String,
  has_password: Schema.Number,
  org_id: Schema.String,
  path: Schema.String,
  size: Schema.Number,
});

type PublishedFileRow = typeof PublishedFileRowSchema.Type;

interface PublishedFile {
  readonly blobId: string;
  readonly contentType: string;
  readonly isPasswordProtected: boolean;
  readonly path: string;
  readonly size: number;
}

interface OrgRow {
  readonly org_id: string;
}

interface RowQuery<Row extends OrgRow> {
  readonly bound: readonly BoundValue[];
  readonly missing: string;
  readonly orgId: string;
  readonly schema: RowSchema<Row>;
  readonly sql: string;
}

const projectById = tq<{ readonly projectId: string }>`
  SELECT p.org_id, p.id, p.name
  FROM project p
  WHERE p.org_id = :org AND p.id = :projectId AND p.deleted_at IS NULL`;

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

interface ViewerDbApi {
  readonly project: () => Effect.Effect<ViewedProject, NotFound, ViewerScope>;
  readonly readFile: (
    path: string
  ) => Effect.Effect<PublishedFile, NotFound, ViewerScope>;
}

const toPublishedFile = (row: PublishedFileRow): PublishedFile => ({
  blobId: row.blob_id,
  contentType: row.content_type,
  isPasswordProtected: row.has_password === 1,
  path: row.path,
  size: row.size,
});

const makeFirstRow =
  (db: D1Database) =>
  <Row extends OrgRow>(query: RowQuery<Row>): Effect.Effect<Row, NotFound> =>
    Effect.gen(function* run() {
      const found = yield* Effect.promise(() =>
        db
          .prepare(query.sql)
          .bind(...query.bound)
          .first()
      );

      if (found === null) {
        return yield* new NotFound({ message: query.missing });
      }

      const row = yield* Effect.orDie(
        Schema.decodeUnknownEffect(query.schema)(found)
      );

      if (row.org_id !== query.orgId) {
        return yield* Effect.die(
          new RowOrgMismatch({
            message: WRONG_ORG_MESSAGE,
            statement: query.sql,
          })
        );
      }

      return row;
    });

const makeViewerDb = (db: D1Database): ViewerDbApi => {
  const firstRow = makeFirstRow(db);

  return {
    project: Effect.fn("ViewerDb.project")(function* run() {
      const scope = yield* ViewerScope;

      return yield* firstRow({
        bound: projectById.bind(scope.orgId, { projectId: scope.projectId }),
        missing: PROJECT_MISSING,
        orgId: scope.orgId,
        schema: ViewedProjectSchema,
        sql: projectById.sql,
      });
    }),
    readFile: Effect.fn("ViewerDb.readFile")(function* run(path: string) {
      const scope = yield* ViewerScope;

      if (scope.kind !== "public" || scope.liveVersionId === null) {
        return yield* new NotFound({ message: FILE_MISSING });
      }

      const row = yield* firstRow({
        bound: publishedFile.bind(scope.orgId, {
          path,
          publicationId: scope.publicationId,
          versionId: scope.liveVersionId,
        }),
        missing: FILE_MISSING,
        orgId: scope.orgId,
        schema: PublishedFileRowSchema,
        sql: publishedFile.sql,
      });

      return toPublishedFile(row);
    }),
  };
};

class ViewerDb extends Context.Service<ViewerDb, ViewerDbApi>()(
  "design-studio/tenant/ViewerDb"
) {
  declare public readonly access: "read";

  public static readonly layer = Layer.effect(
    ViewerDb,
    Effect.gen(function* make() {
      const bindings = yield* CloudBindings;

      return ViewerDb.of(makeViewerDb(bindings.db));
    })
  );
}

export { ViewerDb };

export type { PublishedFile, ViewedProject, ViewerDbApi };
