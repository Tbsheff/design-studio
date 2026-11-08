import { NotFound } from "@design-studio/actions/_core/errors/not-found";
import { Context, Effect, Layer } from "effect";

import { CloudBindings } from "../../platform/bindings.js";
import { createKeyMetaStore } from "../../platform/key-meta-store.js";
import type { KeyRow } from "../../platform/key-meta-store.js";
import { CurrentOrg } from "../current-org.js";

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
}

interface KeyPermRepoApi {
  readonly insertMeta: (
    input: KeyMetaInput
  ) => Effect.Effect<void, never, CurrentOrg>;
  readonly introspect: (
    keyId: string
  ) => Effect.Effect<KeyRecordWire, NotFound, CurrentOrg>;
  readonly list: () => Effect.Effect<
    readonly KeyRecordWire[],
    never,
    CurrentOrg
  >;
  readonly revoke: (keyId: string) => Effect.Effect<void, NotFound, CurrentOrg>;
}

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

      const store = createKeyMetaStore(db);

      const insertMeta = Effect.fn("KeyPermRepo.insertMeta")(function* run(
        input: KeyMetaInput
      ) {
        const org = yield* CurrentOrg;

        yield* store.insertMeta({ ...input, orgId: org.orgId });
      });

      const introspect = Effect.fn("KeyPermRepo.introspect")(function* run(
        keyId: string
      ) {
        const org = yield* CurrentOrg;
        const row = yield* store.findKey(org.orgId, keyId);

        if (row === null) {
          return yield* toMissing();
        }

        return toRecord(row);
      });

      const list = Effect.fn("KeyPermRepo.list")(function* run() {
        const org = yield* CurrentOrg;
        const rows = yield* store.listKeys(org.orgId);

        return rows.map((row) => toRecord(row));
      });

      const revoke = Effect.fn("KeyPermRepo.revoke")(function* run(
        keyId: string
      ) {
        const org = yield* CurrentOrg;
        const changes = yield* store.revokeKey(org.orgId, keyId);

        if (changes === 0) {
          return yield* toMissing();
        }
      });

      return KeyPermRepo.of({ insertMeta, introspect, list, revoke });
    })
  );
}

export { KeyPermRepo };

export type { KeyMetaInput, KeyPermRepoApi, KeyRecordWire };
