import { randomUUID } from "node:crypto";
import path from "node:path";

import { Context, Effect, Layer, Schema, Semaphore } from "effect";

import { Conflict } from "../../shared/actions/_core/errors/conflict.js";
import type { Unauthenticated } from "../../shared/actions/_core/errors/unauthenticated.js";
import type { Unavailable } from "../../shared/actions/_core/errors/unavailable.js";
import type { CloudRef } from "../../shared/cloud-contracts.js";
import { setPrivateJson } from "../platform/atomic-write/index.js";
import { loadConfig } from "../platform/config/index.js";
import { toJsonFileReader } from "../platform/local-file/index.js";
import { DeviceBindings } from "../store/index.js";
import { CloudClient } from "./cloud-client.js";
import type { SyncChange } from "./cloud-client.js";
import { CloudMigrationRunner } from "./cloud-migration-runner.js";
import type { CloudSession } from "./cloud-session.js";
import { OutboxStore } from "./outbox-store.js";
import type { OutboxEntry } from "./outbox.js";

interface SyncKey {
  readonly orgId: string;
  readonly projectId: string;
}

interface PullResult {
  readonly applied: number;
  readonly forked: number;
  readonly localProjectId: string;
}

interface SyncWorkerApi {
  readonly pullNext: (
    key: SyncKey
  ) => Effect.Effect<
    PullResult,
    Conflict | Unauthenticated | Unavailable,
    CloudSession
  >;
  readonly pushPending: (
    key: SyncKey
  ) => Effect.Effect<
    number,
    Conflict | Unauthenticated | Unavailable,
    CloudSession
  >;
}

const SyncStateSchema = Schema.Struct({
  applied: Schema.Array(
    Schema.Struct({
      op: Schema.String,
      rowId: Schema.String,
      rowRev: Schema.Number,
      seq: Schema.Number,
      table: Schema.String,
    })
  ),
  cursor: Schema.Number,
  forks: Schema.Record(Schema.String, Schema.String),
  rev: Schema.Number,
});

type SyncState = typeof SyncStateSchema.Type;

const CLOUD_DIR = "cloud";
const SYNC_DIR = "sync";
const PUSH_LIMIT = 100;
const PULL_LIMIT = 100;
const APPLIED_KEEP = 500;
const DIRECTION_TABLE = "direction";
const ORG_MISMATCH = "The project belongs to another organization.";
const NOT_MIGRATED = "The project is not bound to an organization yet.";
const NOT_SHARED = "The project has no cloud copy yet.";

const EMPTY_STATE: SyncState = { applied: [], cursor: 0, forks: {}, rev: 0 };

const readState = toJsonFileReader(SyncStateSchema);

const toStateFile = (localProjectId: string): string =>
  path.join(
    loadConfig().dataDir,
    CLOUD_DIR,
    SYNC_DIR,
    `${encodeURIComponent(localProjectId)}.json`
  );

const toChange = (entry: OutboxEntry): SyncChange => ({
  id: randomUUID(),
  op: entry.op === "delete" ? "delete" : "update",
  rowId: entry.rowId,
  rowRev: entry.rowRev,
  tableName: entry.table,
});

const isOwnedBy = (entry: OutboxEntry, localProjectId: string): boolean =>
  entry.payload["projectId"] === localProjectId;

const requireRef = Effect.fn("SyncWorker.requireRef")(function* run(
  key: SyncKey,
  isBound: boolean,
  cloudRef: CloudRef | null,
  bindingOrgId: string
) {
  if (!isBound) {
    return yield* new Conflict({ message: NOT_MIGRATED });
  }

  if (cloudRef === null) {
    return yield* new Conflict({ message: NOT_SHARED });
  }

  if (cloudRef.orgId !== bindingOrgId || cloudRef.orgId !== key.orgId) {
    return yield* new Conflict({ message: ORG_MISMATCH });
  }

  return cloudRef;
});

class SyncWorker extends Context.Service<SyncWorker, SyncWorkerApi>()(
  "design-studio/cloud/SyncWorker"
) {
  declare public readonly access: "write";

  public static readonly layer = Layer.effect(
    SyncWorker,
    Effect.gen(function* build() {
      const client = yield* CloudClient;
      const outbox = yield* OutboxStore;
      const bindings = yield* DeviceBindings;
      const migration = yield* CloudMigrationRunner;
      const lock = yield* Semaphore.make(1);

      const resolve = Effect.fn("SyncWorker.resolve")(function* run(
        key: SyncKey
      ) {
        const localProjectId = yield* bindings.createLocalProjectId(key);
        const binding = yield* bindings.get(key);
        const isBound = yield* migration.isBound(localProjectId);
        const cloudRef = yield* requireRef(
          key,
          isBound && binding !== null,
          binding?.cloudRef ?? null,
          binding?.orgId ?? ""
        );
        const file = toStateFile(localProjectId);
        const state = (yield* readState(file)) ?? EMPTY_STATE;

        return { cloudRef, file, localProjectId, state };
      });

      const pushPending = Effect.fn("SyncWorker.pushPending")(function* run(
        key: SyncKey
      ) {
        const target = yield* resolve(key);
        const pending = (yield* outbox.listPending(PUSH_LIMIT * 4))
          .filter((entry) => isOwnedBy(entry, target.localProjectId))
          .slice(0, PUSH_LIMIT);

        if (pending.length === 0) {
          return 0;
        }

        const result = yield* client.push({
          changes: pending.map(toChange),
          orgId: key.orgId,
          projectId: target.cloudRef.pid,
          rev: target.state.rev,
          sig: target.cloudRef.sig,
        });

        yield* setPrivateJson(target.file, {
          ...target.state,
          rev: result.rev,
        });

        return yield* outbox.ack(pending);
      });

      const pullNext = Effect.fn("SyncWorker.pullNext")(function* run(
        key: SyncKey
      ) {
        const target = yield* resolve(key);
        const page = yield* client.pull({
          after: target.state.cursor,
          limit: PULL_LIMIT,
          orgId: key.orgId,
          projectId: target.cloudRef.pid,
          sig: target.cloudRef.sig,
        });
        const pending = yield* outbox.listPending(PUSH_LIMIT * 4);
        const forks: Record<string, string> = { ...target.state.forks };
        let forked = 0;

        for (const item of page.items) {
          const local = pending.find(
            (entry) =>
              entry.table === item.table_name &&
              entry.rowId === item.row_id &&
              isOwnedBy(entry, target.localProjectId)
          );

          if (
            item.table_name === DIRECTION_TABLE &&
            local !== undefined &&
            local.rowRev !== item.row_rev
          ) {
            const forkId = randomUUID();

            forks[item.row_id] = forkId;
            yield* outbox.append({ ...local, rowId: forkId, rowRev: 1 });
            yield* outbox.ack([local]);
            forked += 1;
          }
        }

        const applied = [
          ...target.state.applied,
          ...page.items.map((item) => ({
            op: item.op,
            rowId: forks[item.row_id] ?? item.row_id,
            rowRev: item.row_rev,
            seq: item.seq,
            table: item.table_name,
          })),
        ].slice(-APPLIED_KEEP);

        yield* setPrivateJson(target.file, {
          applied,
          cursor: page.cursor ?? target.state.cursor,
          forks,
          rev: target.state.rev,
        });

        return {
          applied: page.items.length,
          forked,
          localProjectId: target.localProjectId,
        };
      });

      return SyncWorker.of({
        pullNext: (key) => lock.withPermits(1)(pullNext(key)),
        pushPending: (key) => lock.withPermits(1)(pushPending(key)),
      });
    })
  );
}

export { SyncWorker };

export type { PullResult, SyncKey, SyncWorkerApi };
