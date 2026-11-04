import { Context, Effect, Layer, Schema } from "effect";

import { CloudBindings } from "../platform/bindings.js";

const BATCH = 100;

const DUE_SHARES_SQL =
  "SELECT s.org_id, s.id FROM share s WHERE s.expires_at IS NOT NULL AND s.expires_at <= ?1 AND s.revoked_at IS NULL ORDER BY s.org_id, s.id LIMIT ?2";

const REVOKE_SHARE_SQL =
  "UPDATE share SET revoked_at = ?1, revoked_by = 'cron', rev = rev + 1 WHERE org_id = ?2 AND id = ?3 AND revoked_at IS NULL";

const DUE_PUBLICATIONS_SQL =
  "SELECT p.org_id, p.id FROM publication p WHERE p.expires_at IS NOT NULL AND p.expires_at <= ?1 AND p.deleted_at IS NULL ORDER BY p.org_id, p.id LIMIT ?2";

const EXPIRE_PUBLICATION_SQL =
  "UPDATE publication SET deleted_at = ?1, updated_at = ?1, rev = rev + 1 WHERE org_id = ?2 AND id = ?3 AND deleted_at IS NULL";

const NEW_ZERO_BLOBS_SQL =
  "SELECT b.org_id, b.id FROM blob_ref b WHERE b.refcount = 0 AND b.zero_at IS NULL ORDER BY b.org_id, b.id LIMIT ?1";

const MARK_ZERO_BLOB_SQL =
  "UPDATE blob_ref SET zero_at = ?1 WHERE org_id = ?2 AND id = ?3 AND refcount = 0 AND zero_at IS NULL";

const OLD_ZERO_BLOBS_SQL =
  "SELECT b.org_id, b.id FROM blob_ref b WHERE b.refcount = 0 AND b.zero_at IS NOT NULL AND b.zero_at <= ?1 ORDER BY b.org_id, b.id LIMIT ?2";

const DROP_BLOB_SQL =
  "DELETE FROM blob_ref WHERE org_id = ?1 AND id = ?2 AND refcount = 0 AND zero_at IS NOT NULL AND zero_at <= ?3 AND NOT EXISTS (SELECT 1 FROM version_file f WHERE f.org_id = ?1 AND f.blob_id = ?2) AND NOT EXISTS (SELECT 1 FROM publication_file p WHERE p.org_id = ?1 AND p.blob_id = ?2)";

const SweptRowSchema = Schema.Struct({
  id: Schema.String,
  org_id: Schema.String,
});

const decodeRows = Schema.decodeUnknownEffect(Schema.Array(SweptRowSchema));

interface SweptRow {
  readonly id: string;
  readonly orgId: string;
}

interface SweepDbApi {
  readonly dropZeroBlobs: (
    cutoff: number
  ) => Effect.Effect<readonly SweptRow[]>;
  readonly expirePublications: (now: number) => Effect.Effect<number>;
  readonly expireShares: (now: number) => Effect.Effect<readonly SweptRow[]>;
  readonly markZeroBlobs: (now: number) => Effect.Effect<number>;
}

const toSwept = (row: typeof SweptRowSchema.Type): SweptRow => ({
  id: row.id,
  orgId: row.org_id,
});

const makeSweepDb = (db: D1Database): SweepDbApi => {
  const select = Effect.fn("SweepDb.select")(function* run(
    sql: string,
    values: readonly number[]
  ) {
    const result = yield* Effect.promise(() =>
      db
        .prepare(sql)
        .bind(...values)
        .all()
    );

    const rows = yield* Effect.orDie(decodeRows(result.results));

    return rows.map((row) => toSwept(row));
  });

  const writeEach = Effect.fn("SweepDb.writeEach")(function* run(
    sql: string,
    rows: readonly SweptRow[],
    toValues: (row: SweptRow) => readonly (number | string)[]
  ) {
    if (rows.length === 0) {
      return [];
    }

    const statement = db.prepare(sql);

    const results = yield* Effect.promise(() =>
      db.batch(rows.map((row) => statement.bind(...toValues(row))))
    );

    return rows.filter((_row, index) => results[index]?.meta.changes === 1);
  });

  return {
    dropZeroBlobs: Effect.fn("SweepDb.dropZeroBlobs")(function* run(cutoff) {
      const due = yield* select(OLD_ZERO_BLOBS_SQL, [cutoff, BATCH]);

      return yield* writeEach(DROP_BLOB_SQL, due, (row) => [
        row.orgId,
        row.id,
        cutoff,
      ]);
    }),
    expirePublications: Effect.fn("SweepDb.expirePublications")(
      function* run(now) {
        const due = yield* select(DUE_PUBLICATIONS_SQL, [now, BATCH]);

        const changed = yield* writeEach(EXPIRE_PUBLICATION_SQL, due, (row) => [
          now,
          row.orgId,
          row.id,
        ]);

        return changed.length;
      }
    ),
    expireShares: Effect.fn("SweepDb.expireShares")(function* run(now) {
      const due = yield* select(DUE_SHARES_SQL, [now, BATCH]);

      return yield* writeEach(REVOKE_SHARE_SQL, due, (row) => [
        now,
        row.orgId,
        row.id,
      ]);
    }),
    markZeroBlobs: Effect.fn("SweepDb.markZeroBlobs")(function* run(now) {
      const due = yield* select(NEW_ZERO_BLOBS_SQL, [BATCH]);

      const changed = yield* writeEach(MARK_ZERO_BLOB_SQL, due, (row) => [
        now,
        row.orgId,
        row.id,
      ]);

      return changed.length;
    }),
  };
};

class SweepDb extends Context.Service<SweepDb, SweepDbApi>()(
  "design-studio/tenant/SweepDb"
) {
  declare public readonly access: "write";

  public static readonly layer = Layer.effect(
    SweepDb,
    Effect.gen(function* make() {
      const bindings = yield* CloudBindings;

      return SweepDb.of(makeSweepDb(bindings.db));
    })
  );
}

export { SweepDb };

export type { SweepDbApi, SweptRow };
