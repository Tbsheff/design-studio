import { Context, Effect, Layer } from "effect";

import { CloudBindings } from "../../platform/bindings.js";
import { NotFound } from "../../shared-actions.js";

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

interface KeyRecordWire {
  readonly actingUserId: string;
  readonly createdAt: number;
  readonly keyId: string;
  readonly name: string;
  readonly orgId: string;
  readonly perms: readonly string[];
  readonly revoked: boolean;
}

interface KeyMetaInput {
  readonly actingUserId: string;
  readonly createdBy: string;
  readonly keyId: string;
  readonly orgId: string;
}

interface KeyPermRepoApi {
  readonly insertMeta: (input: KeyMetaInput) => Effect.Effect<void>;
  readonly introspect: (
    orgId: string,
    keyId: string
  ) => Effect.Effect<KeyRecordWire, NotFound>;
  readonly list: (orgId: string) => Effect.Effect<readonly KeyRecordWire[]>;
  readonly revoke: (
    orgId: string,
    keyId: string
  ) => Effect.Effect<void, NotFound>;
}

const SELECT_KEY = `SELECT m.org_id AS org_id, m.key_id AS id, m.acting_user_id AS acting_user_id, m.created_at AS created_at, k."name" AS name, k."enabled" AS enabled, k."expiresAt" AS expires_at, k."permissions" AS permissions
  FROM key_meta m JOIN "apikey" k ON k."id" = m.key_id
  WHERE m.org_id = ?`;

const LIST_LIMIT = 100;

const parsePerms = (text: string | null): readonly string[] => {
  if (text === null) {
    return [];
  }

  const grants = JSON.parse(text) as Readonly<
    Record<string, readonly string[]>
  >;

  return Object.entries(grants).flatMap(([resource, actions]) =>
    actions.map((action) => `${resource}.${action}`)
  );
};

const isExpired = (row: KeyRow, now: number): boolean =>
  row.expires_at !== null && new Date(row.expires_at).getTime() <= now;

const toRecord = (row: KeyRow): KeyRecordWire => ({
  actingUserId: row.acting_user_id,
  createdAt: row.created_at,
  keyId: row.id,
  name: row.name ?? "",
  orgId: row.org_id,
  perms: parsePerms(row.permissions),
  revoked: row.enabled === 0 || isExpired(row, Date.now()),
});

const toMissing = (): NotFound =>
  new NotFound({ message: "The key does not exist." });

class KeyPermRepo extends Context.Service<KeyPermRepo, KeyPermRepoApi>()(
  "design-studio/tenant/KeyPermRepo"
) {
  declare public readonly access: "write";

  public static readonly layer = Layer.effect(
    KeyPermRepo,
    Effect.gen(function* make() {
      const { db } = yield* CloudBindings;

      const insertMeta = Effect.fn("KeyPermRepo.insertMeta")(function* run(
        input: KeyMetaInput
      ) {
        yield* Effect.promise(() =>
          db
            .prepare(
              "INSERT INTO key_meta (key_id, org_id, acting_user_id, created_by, created_at) VALUES (?, ?, ?, ?, ?)"
            )
            .bind(
              input.keyId,
              input.orgId,
              input.actingUserId,
              input.createdBy,
              Date.now()
            )
            .run()
        );
      });

      const introspect = Effect.fn("KeyPermRepo.introspect")(function* run(
        orgId: string,
        keyId: string
      ) {
        const row = yield* Effect.promise(() =>
          db
            .prepare(`${SELECT_KEY} AND m.key_id = ?`)
            .bind(orgId, keyId)
            .first<KeyRow>()
        );

        if (row === null) {
          return yield* toMissing();
        }

        return toRecord(row);
      });

      const list = Effect.fn("KeyPermRepo.list")(function* run(orgId: string) {
        const result = yield* Effect.promise(() =>
          db
            .prepare(`${SELECT_KEY} ORDER BY m.created_at DESC LIMIT ?`)
            .bind(orgId, LIST_LIMIT)
            .all<KeyRow>()
        );

        return result.results.map(toRecord);
      });

      const revoke = Effect.fn("KeyPermRepo.revoke")(function* run(
        orgId: string,
        keyId: string
      ) {
        const result = yield* Effect.promise(() =>
          db
            .prepare(
              'UPDATE "apikey" SET "enabled" = 0 WHERE "id" = ? AND "id" IN (SELECT key_id FROM key_meta WHERE org_id = ? AND key_id = ?)'
            )
            .bind(keyId, orgId, keyId)
            .run()
        );

        if (result.meta.changes === 0) {
          return yield* toMissing();
        }
      });

      return KeyPermRepo.of({ insertMeta, introspect, list, revoke });
    })
  );
}

export { KeyPermRepo };

export type { KeyMetaInput, KeyPermRepoApi, KeyRecordWire };
