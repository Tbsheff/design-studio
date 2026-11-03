import { Context, Effect, Layer } from "effect";

import { NotFound } from "../../../../src/shared/actions/_core/errors/not-found.js";
import { CloudBindings } from "../platform/bindings.js";
import { toBlobKey, toBlobPrefix } from "./blob-key.js";
import type { BlobKind, BlobRef } from "./blob-key.js";
import { CurrentOrg } from "./current-org.js";
import { TenantDb } from "./db.js";
import type { TenantDbApi } from "./db.js";
import { BadBlobId } from "./errors/bad-blob-id.js";
import { tq } from "./sql.js";
import { ViewerScope } from "./viewer-scope.js";

interface BlobPage {
  readonly cursor: string | null;
  readonly names: readonly string[];
}

type BlobBody = ArrayBuffer | ReadableStream | string;

const LIST_MAX = 100;

const auditBadId = tq<{
  readonly action: string;
  readonly actorKind: string;
  readonly createdAt: number;
  readonly detail: string;
  readonly id: string;
  readonly targetTable: string;
}>`
  INSERT INTO audit_log (org_id, id, actor_kind, action, target_table, detail, created_at)
  VALUES (:org, :id, :actorKind, :action, :targetTable, :detail, :createdAt)
  RETURNING org_id`;

interface TenantBlobsApi {
  readonly delete: (ref: BlobRef) => Effect.Effect<void, never, CurrentOrg>;
  readonly get: (
    ref: BlobRef
  ) => Effect.Effect<R2ObjectBody, NotFound, CurrentOrg>;
  readonly getPublished: (
    blobId: string
  ) => Effect.Effect<R2ObjectBody, NotFound, ViewerScope>;
  readonly list: (
    kind: BlobKind,
    cursor: string | null
  ) => Effect.Effect<BlobPage, never, CurrentOrg>;
  readonly put: (
    ref: BlobRef,
    body: BlobBody
  ) => Effect.Effect<void, never, CurrentOrg>;
}

const makeKeyOf = (
  db: TenantDbApi
): ((ref: BlobRef) => Effect.Effect<string, never, CurrentOrg>) =>
  Effect.fn("TenantBlobs.keyOf")(function* run(ref: BlobRef) {
    const org = yield* CurrentOrg;
    const key = toBlobKey(org.orgId, ref);

    if (key === null) {
      yield* db.insert(auditBadId, {
        action: "blob.badId",
        actorKind: "system",
        createdAt: Date.now(),
        detail: ref.kind,
        id: crypto.randomUUID(),
        targetTable: "blob_ref",
      });

      return yield* Effect.die(
        new BadBlobId({
          kind: ref.kind,
          message: "The blob name is not valid.",
        })
      );
    }

    return key;
  });

const toPage = (prefix: string, listed: R2Objects): BlobPage => {
  const names = listed.objects.map((object) => object.key.slice(prefix.length));

  if (listed.truncated) {
    return { cursor: listed.cursor, names };
  }

  return { cursor: null, names };
};

const makeBlobs = (files: R2Bucket, db: TenantDbApi): TenantBlobsApi => {
  const keyOf = makeKeyOf(db);

  return {
    delete: Effect.fn("TenantBlobs.delete")(function* run(ref) {
      const key = yield* keyOf(ref);

      yield* Effect.promise(() => files.delete(key));
    }),
    get: Effect.fn("TenantBlobs.get")(function* run(ref) {
      const key = yield* keyOf(ref);
      const object = yield* Effect.promise(() => files.get(key));

      if (object === null) {
        return yield* new NotFound({ message: "The file does not exist." });
      }

      return object;
    }),
    getPublished: Effect.fn("TenantBlobs.getPublished")(function* run(blobId) {
      const scope = yield* ViewerScope;
      const key = toBlobKey(scope.orgId, { kind: "blob", name: blobId });

      if (key === null) {
        return yield* Effect.die(
          new BadBlobId({
            kind: "blob",
            message: "The blob name is not valid.",
          })
        );
      }

      const object = yield* Effect.promise(() => files.get(key));

      if (object === null) {
        return yield* new NotFound({ message: "The file does not exist." });
      }

      return object;
    }),
    list: Effect.fn("TenantBlobs.list")(function* run(kind, cursor) {
      const org = yield* CurrentOrg;
      const prefix = toBlobPrefix(org.orgId, kind);
      const options: R2ListOptions = { limit: LIST_MAX, prefix };

      if (cursor !== null) {
        options.cursor = cursor;
      }

      const listed = yield* Effect.promise(() => files.list(options));

      return toPage(prefix, listed);
    }),
    put: Effect.fn("TenantBlobs.put")(function* run(ref, body) {
      const key = yield* keyOf(ref);

      yield* Effect.promise(() => files.put(key, body));
    }),
  };
};

class TenantBlobs extends Context.Service<TenantBlobs, TenantBlobsApi>()(
  "design-studio/tenant/TenantBlobs"
) {
  declare public readonly access: "write";

  public static readonly layer = Layer.effect(
    TenantBlobs,
    Effect.gen(function* make() {
      const bindings = yield* CloudBindings;
      const db = yield* TenantDb;

      return TenantBlobs.of(makeBlobs(bindings.files, db));
    })
  );
}

export { TenantBlobs };

export type { BlobBody, BlobPage, TenantBlobsApi };
