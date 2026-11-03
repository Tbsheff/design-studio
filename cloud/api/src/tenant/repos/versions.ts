import { Context, Effect, Layer, Schema } from "effect";

import type { NotFound } from "../../shared-actions.js";
import type { CurrentOrg } from "../current-org.js";
import { TenantDb, toBatchEntry } from "../db.js";
import { tq } from "../sql.js";

const PAGE_MAX = 100;

const VersionRowSchema = Schema.Struct({
  author_id: Schema.NullOr(Schema.String),
  created_at: Schema.Number,
  direction_id: Schema.String,
  id: Schema.String,
  message: Schema.NullOr(Schema.String),
  org_id: Schema.String,
  parent_version_id: Schema.NullOr(Schema.String),
  rev: Schema.Number,
});

const DirectionHeadSchema = Schema.Struct({
  head_version_id: Schema.NullOr(Schema.String),
  id: Schema.String,
  org_id: Schema.String,
  rev: Schema.Number,
});

const VersionFileRowSchema = Schema.Struct({
  blob_id: Schema.String,
  id: Schema.String,
  mode: Schema.Number,
  org_id: Schema.String,
  path: Schema.String,
  version_id: Schema.String,
});

const BlobRefRowSchema = Schema.Struct({
  id: Schema.String,
  org_id: Schema.String,
  refcount: Schema.Number,
  size: Schema.Number,
  zero_at: Schema.NullOr(Schema.Number),
});

type VersionRow = typeof VersionRowSchema.Type;

type DirectionHead = typeof DirectionHeadSchema.Type;

type VersionFileRow = typeof VersionFileRowSchema.Type;

type BlobRefRow = typeof BlobRefRowSchema.Type;

interface VersionCreate {
  readonly authorId: string | null;
  readonly directionId: string;
  readonly id: string;
  readonly message: string | null;
  readonly parentVersionId: string | null;
}

interface HeadAdvance {
  readonly directionId: string;
  readonly expectedRev: number;
  readonly versionId: string;
}

interface VersionFileAdd {
  readonly blobId: string;
  readonly id: string;
  readonly mode: number;
  readonly path: string;
  readonly versionId: string;
}

interface StoredFile {
  readonly blob: BlobRefAdd;
  readonly file: VersionFileAdd;
}

interface BlobRefAdd {
  readonly id: string;
  readonly size: number;
}

interface VersionPage {
  readonly cursor: string | null;
  readonly items: readonly VersionRow[];
}

interface FilePage {
  readonly cursor: string | null;
  readonly items: readonly VersionFileRow[];
}

const versionById = tq<{ readonly id: string }>`
  SELECT v.org_id, v.id, v.rev, v.direction_id, v.parent_version_id, v.message, v.author_id, v.created_at
  FROM version v
  WHERE v.org_id = :org AND v.id = :id`;

const versionPage = tq<{
  readonly after: string;
  readonly directionId: string;
  readonly limit: number;
}>`
  SELECT v.org_id, v.id, v.rev, v.direction_id, v.parent_version_id, v.message, v.author_id, v.created_at
  FROM version v
  WHERE v.org_id = :org AND v.direction_id = :directionId AND v.id > :after
  ORDER BY v.id
  LIMIT :limit`;

const versionCreate = tq<{
  readonly authorId: string | null;
  readonly directionId: string;
  readonly id: string;
  readonly message: string | null;
  readonly now: number;
  readonly parentVersionId: string | null;
}>`
  INSERT INTO version (org_id, id, direction_id, parent_version_id, message, author_id, created_at)
  VALUES (:org, :id, :directionId, :parentVersionId, :message, :authorId, :now)
  RETURNING org_id`;

const directionHead = tq<{ readonly id: string }>`
  SELECT d.org_id, d.id, d.rev, d.head_version_id
  FROM direction d
  WHERE d.org_id = :org AND d.id = :id AND d.deleted_at IS NULL`;

const advanceHead = tq<{
  readonly directionId: string;
  readonly expectedRev: number;
  readonly now: number;
  readonly versionId: string;
}>`
  UPDATE direction
  SET head_version_id = :versionId, rev = rev + 1, updated_at = :now
  WHERE org_id = :org AND id = :directionId AND rev = :expectedRev AND deleted_at IS NULL
  RETURNING org_id`;

const filePage = tq<{
  readonly after: string;
  readonly limit: number;
  readonly versionId: string;
}>`
  SELECT f.org_id, f.id, f.version_id, f.path, f.blob_id, f.mode
  FROM version_file f
  WHERE f.org_id = :org AND f.version_id = :versionId AND f.path > :after
  ORDER BY f.path
  LIMIT :limit`;

const fileAdd = tq<{
  readonly blobId: string;
  readonly id: string;
  readonly mode: number;
  readonly path: string;
  readonly versionId: string;
}>`
  INSERT INTO version_file (org_id, id, version_id, path, blob_id, mode)
  VALUES (:org, :id, :versionId, :path, :blobId, :mode)
  RETURNING org_id`;

const blobById = tq<{ readonly id: string }>`
  SELECT b.org_id, b.id, b.size, b.refcount, b.zero_at
  FROM blob_ref b
  WHERE b.org_id = :org AND b.id = :id`;

const blobRetain = tq<{
  readonly id: string;
  readonly now: number;
  readonly size: number;
}>`
  INSERT INTO blob_ref (org_id, id, size, refcount, created_at)
  VALUES (:org, :id, :size, 1, :now)
  ON CONFLICT (org_id, id) DO UPDATE SET refcount = refcount + 1, rev = rev + 1, zero_at = NULL
  RETURNING org_id`;

const blobRelease = tq<{ readonly id: string; readonly now: number }>`
  UPDATE blob_ref
  SET refcount = refcount - 1, rev = rev + 1, zero_at = CASE WHEN refcount <= 1 THEN :now ELSE NULL END
  WHERE org_id = :org AND id = :id AND refcount > 0
  RETURNING org_id`;

interface VersionsRepoApi {
  readonly addFile: (
    input: VersionFileAdd
  ) => Effect.Effect<void, never, CurrentOrg>;
  readonly advanceHead: (
    input: HeadAdvance
  ) => Effect.Effect<void, NotFound, CurrentOrg>;
  readonly createVersion: (
    input: VersionCreate
  ) => Effect.Effect<void, never, CurrentOrg>;
  readonly getBlob: (
    id: string
  ) => Effect.Effect<BlobRefRow, NotFound, CurrentOrg>;
  readonly getHead: (
    directionId: string
  ) => Effect.Effect<DirectionHead, NotFound, CurrentOrg>;
  readonly getVersion: (
    id: string
  ) => Effect.Effect<VersionRow, NotFound, CurrentOrg>;
  readonly listFiles: (
    versionId: string,
    after: string | null,
    limit: number
  ) => Effect.Effect<FilePage, never, CurrentOrg>;
  readonly listVersions: (
    directionId: string,
    after: string | null,
    limit: number
  ) => Effect.Effect<VersionPage, never, CurrentOrg>;
  readonly releaseBlob: (
    id: string
  ) => Effect.Effect<void, NotFound, CurrentOrg>;
  readonly retainBlob: (
    input: BlobRefAdd
  ) => Effect.Effect<void, never, CurrentOrg>;
  readonly storeFiles: (
    files: readonly StoredFile[]
  ) => Effect.Effect<void, never, CurrentOrg>;
}

const clampLimit = (limit: number): number =>
  Math.min(Math.max(1, limit), PAGE_MAX);

interface KeyPage<Row> {
  readonly cursor: string | null;
  readonly items: readonly Row[];
}

const toPage = <Row>(
  items: readonly Row[],
  limit: number,
  key: (row: Row) => string
): KeyPage<Row> => {
  const last = items.at(-1);

  if (items.length < limit || !last) {
    return { cursor: null, items };
  }

  return { cursor: key(last), items };
};

class VersionsRepo extends Context.Service<VersionsRepo, VersionsRepoApi>()(
  "design-studio/tenant/VersionsRepo"
) {
  declare public readonly access: "write";

  public static readonly layer = Layer.effect(
    VersionsRepo,
    Effect.gen(function* make() {
      const db = yield* TenantDb;

      return VersionsRepo.of({
        addFile: (input) => db.insert(fileAdd, input),
        advanceHead: (input) =>
          db.write(advanceHead, { ...input, now: Date.now() }),
        createVersion: (input) =>
          db.insert(versionCreate, { ...input, now: Date.now() }),
        getBlob: (id) => db.first(blobById, { id }, BlobRefRowSchema),
        getHead: (directionId) =>
          db.first(directionHead, { id: directionId }, DirectionHeadSchema),
        getVersion: (id) => db.first(versionById, { id }, VersionRowSchema),
        listFiles: Effect.fn("VersionsRepo.listFiles")(
          function* run(versionId, after, limit) {
            const size = clampLimit(limit);

            const items = yield* db.all(
              filePage,
              { after: after ?? "", limit: size, versionId },
              VersionFileRowSchema
            );

            return toPage(items, size, (row) => row.path);
          }
        ),
        listVersions: Effect.fn("VersionsRepo.listVersions")(
          function* run(directionId, cursor, requested) {
            const size = clampLimit(requested);
            const after = cursor ?? "";
            const limit = size;

            const items = yield* db.all(
              versionPage,
              { after, directionId, limit },
              VersionRowSchema
            );

            return toPage(items, size, (row) => row.id);
          }
        ),
        releaseBlob: (id) => db.write(blobRelease, { id, now: Date.now() }),
        retainBlob: (input) =>
          db.insert(blobRetain, { ...input, now: Date.now() }),
        storeFiles: (files) =>
          db.writeAll(
            files.flatMap((stored) => [
              toBatchEntry(blobRetain, { ...stored.blob, now: Date.now() }),
              toBatchEntry(fileAdd, stored.file),
            ])
          ),
      });
    })
  );
}

export { VersionsRepo };

export type {
  BlobRefAdd,
  BlobRefRow,
  DirectionHead,
  FilePage,
  HeadAdvance,
  VersionCreate,
  VersionFileAdd,
  VersionFileRow,
  VersionPage,
  VersionRow,
};
