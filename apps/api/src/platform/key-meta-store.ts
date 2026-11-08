import { Effect } from "effect";

interface KeyRow {
  readonly acting_user_id: string;
  readonly created_at: number;
  readonly enabled: number;
  readonly expires_at: string | null;
  readonly id: string;
  readonly name: string | null;
  readonly org_id: string;
  readonly permissions: string | null;
}

interface KeyMetaInsert {
  readonly actingUserId: string;
  readonly createdBy: string;
  readonly keyId: string;
  readonly orgId: string;
}

interface KeyMetaStoreApi {
  readonly findKey: (
    orgId: string,
    keyId: string
  ) => Effect.Effect<KeyRow | null>;
  readonly insertMeta: (input: KeyMetaInsert) => Effect.Effect<void>;
  readonly listKeys: (orgId: string) => Effect.Effect<readonly KeyRow[]>;
  readonly revokeKey: (orgId: string, keyId: string) => Effect.Effect<number>;
}

const SELECT_KEY = `SELECT m.org_id AS org_id, m.key_id AS id, m.acting_user_id AS acting_user_id, m.created_at AS created_at, k."name" AS name, k."enabled" AS enabled, k."expiresAt" AS expires_at, k."permissions" AS permissions
  FROM key_meta m JOIN "apikey" k ON k."id" = m.key_id
  WHERE m.org_id = ?`;

const INSERT_META_SQL =
  "INSERT INTO key_meta (key_id, org_id, acting_user_id, created_by, created_at) VALUES (?, ?, ?, ?, ?)";

const REVOKE_SQL =
  'UPDATE "apikey" SET "enabled" = 0 WHERE "id" = ? AND "id" IN (SELECT key_id FROM key_meta WHERE org_id = ? AND key_id = ?)';

const LIST_LIMIT = 100;

const createKeyMetaStore = (db: D1Database): KeyMetaStoreApi => ({
  findKey: Effect.fn("KeyMetaStore.findKey")(function* run(orgId, keyId) {
    return yield* Effect.promise(() =>
      db
        .prepare(`${SELECT_KEY} AND m.key_id = ?`)
        .bind(orgId, keyId)
        .first<KeyRow>()
    );
  }),
  insertMeta: Effect.fn("KeyMetaStore.insertMeta")(function* run(input) {
    yield* Effect.promise(() =>
      db
        .prepare(INSERT_META_SQL)
        .bind(
          input.keyId,
          input.orgId,
          input.actingUserId,
          input.createdBy,
          Date.now()
        )
        .run()
    );
  }),
  listKeys: Effect.fn("KeyMetaStore.listKeys")(function* run(orgId) {
    const result = yield* Effect.promise(() =>
      db
        .prepare(`${SELECT_KEY} ORDER BY m.created_at DESC LIMIT ?`)
        .bind(orgId, LIST_LIMIT)
        .all<KeyRow>()
    );

    return result.results;
  }),
  revokeKey: Effect.fn("KeyMetaStore.revokeKey")(function* run(orgId, keyId) {
    const result = yield* Effect.promise(() =>
      db.prepare(REVOKE_SQL).bind(keyId, orgId, keyId).run()
    );

    return result.meta.changes;
  }),
});

export { createKeyMetaStore };

export type { KeyMetaInsert, KeyMetaStoreApi, KeyRow };
