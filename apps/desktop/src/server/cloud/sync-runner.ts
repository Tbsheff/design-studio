import { randomUUID } from "node:crypto";
import path from "node:path";

import { Context, Effect, Layer, Schema, Semaphore } from "effect";

import { Conflict } from "@design-studio/actions/_core/errors/conflict";
import type { Unauthenticated } from "@design-studio/actions/_core/errors/unauthenticated";
import type { Unavailable } from "@design-studio/actions/_core/errors/unavailable";
import type { CloudRef } from "../../shared/cloud-contracts.js";
import { setPrivateJson } from "../platform/atomic-write/index.js";
import { loadConfig } from "../platform/config/index.js";
import { toJsonFileReader } from "../platform/local-file/index.js";
import { DeviceBindings } from "../store/index.js";
import type { DeviceBindingsApi } from "../store/index.js";
import { CloudClient } from "./cloud-client.js";
import type { CloudClientApi, SyncChange } from "./cloud-client.js";
import { CloudMigrationRunner } from "./cloud-migration-runner.js";
import type { CloudMigrationRunnerApi } from "./cloud-migration-runner.js";
import type { CloudSession } from "./cloud-session.js";
import { OutboxStore } from "./outbox-store.js";
import type { OutboxEntry, OutboxStoreApi } from "./outbox.js";

interface SyncKey {
  readonly orgId: string;
  readonly projectId: string;
}

interface PullResult {
  readonly applied: number;
  readonly forked: number;
  readonly localProjectId: string;
}

interface SyncRunnerApi {
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
const PENDING_SCAN = 400;
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

const toOp = (entry: OutboxEntry): SyncChange["op"] => {
  if (entry.op === "delete") {
    return "delete";
  }

  return "update";
};

const toChange = (entry: OutboxEntry): SyncChange => ({
  id: randomUUID(),
  op: toOp(entry),
  rowId: entry.rowId,
  rowRev: entry.rowRev,
  tableName: entry.table,
});

const isOwnedBy = (entry: OutboxEntry, localProjectId: string): boolean =>
  entry.payload["projectId"] === localProjectId;

const requireRef = Effect.fn("SyncRunner.requireRef")(function* run(
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

interface SyncDeps {
  readonly bindings: DeviceBindingsApi;
  readonly client: CloudClientApi;
  readonly migration: CloudMigrationRunnerApi;
  readonly outbox: OutboxStoreApi;
}

interface SyncTargetState {
  readonly cloudRef: CloudRef;
  readonly file: string;
  readonly localProjectId: string;
  readonly state: SyncState;
}

interface PulledItem {
  readonly op: string;
  readonly row_id: string;
  readonly row_rev: number;
  readonly seq: number;
  readonly table_name: string;
}

const resolveTarget = Effect.fn("SyncRunner.resolve")(function* run(
  deps: SyncDeps,
  key: SyncKey
) {
  const localProjectId = yield* deps.bindings.createLocalProjectId(key);
  const binding = yield* deps.bindings.get(key);
  const isBound = yield* deps.migration.isBound(localProjectId);

  const cloudRef = yield* requireRef(
    key,
    isBound && binding !== null,
    binding?.cloudRef ?? null,
    binding?.orgId ?? ""
  );

  const file = toStateFile(localProjectId);
  const state = (yield* readState(file)) ?? EMPTY_STATE;
  const target: SyncTargetState = { cloudRef, file, localProjectId, state };

  return target;
});

const pushPendingWith = Effect.fn("SyncRunner.pushPending")(function* run(
  deps: SyncDeps,
  key: SyncKey
) {
  const target = yield* resolveTarget(deps, key);
  const listed = yield* deps.outbox.listPending(PENDING_SCAN);

  const pending = listed
    .filter((entry) => isOwnedBy(entry, target.localProjectId))
    .slice(0, PUSH_LIMIT);

  if (pending.length === 0) {
    return 0;
  }

  const result = yield* deps.client.push({
    changes: pending.map((entry) => toChange(entry)),
    orgId: key.orgId,
    projectId: target.cloudRef.pid,
    rev: target.state.rev,
    signature: target.cloudRef.sig,
  });

  yield* setPrivateJson(target.file, { ...target.state, rev: result.rev });

  return yield* deps.outbox.ack(pending);
});

const toLocalEntry = (
  pending: readonly OutboxEntry[],
  item: PulledItem,
  localProjectId: string
): OutboxEntry | null =>
  pending.find(
    (entry) =>
      entry.table === item.table_name &&
      entry.rowId === item.row_id &&
      isOwnedBy(entry, localProjectId)
  ) ?? null;

const isForked = (item: PulledItem, local: OutboxEntry | null): boolean =>
  item.table_name === DIRECTION_TABLE &&
  local !== null &&
  local.rowRev !== item.row_rev;

const forkLocal = Effect.fn("SyncRunner.forkLocal")(function* run(
  deps: SyncDeps,
  local: OutboxEntry
) {
  const forkId = randomUUID();

  yield* deps.outbox.append({ ...local, rowId: forkId, rowRev: 1 });
  yield* deps.outbox.ack([local]);

  return forkId;
});

const toApplied = (
  state: SyncState,
  items: readonly PulledItem[],
  forks: Readonly<Record<string, string>>
): SyncState["applied"] =>
  [
    ...state.applied,
    ...items.map((item) => ({
      op: item.op,
      rowId: forks[item.row_id] ?? item.row_id,
      rowRev: item.row_rev,
      seq: item.seq,
      table: item.table_name,
    })),
  ].slice(-APPLIED_KEEP);

const pullNextWith = Effect.fn("SyncRunner.pullNext")(function* run(
  deps: SyncDeps,
  key: SyncKey
) {
  const target = yield* resolveTarget(deps, key);

  const page = yield* deps.client.pull({
    after: target.state.cursor,
    limit: PULL_LIMIT,
    orgId: key.orgId,
    projectId: target.cloudRef.pid,
    signature: target.cloudRef.sig,
  });

  const pending = yield* deps.outbox.listPending(PENDING_SCAN);
  const forks = new Map(Object.entries(target.state.forks));
  const forkedRows: string[] = [];

  for (const item of page.items) {
    const local = toLocalEntry(pending, item, target.localProjectId);

    if (local !== null && isForked(item, local)) {
      forks.set(item.row_id, yield* forkLocal(deps, local));
      forkedRows.push(item.row_id);
    }
  }

  const forkRecord = Object.fromEntries(forks);

  yield* setPrivateJson(target.file, {
    applied: toApplied(target.state, page.items, forkRecord),
    cursor: page.cursor ?? target.state.cursor,
    forks: forkRecord,
    rev: target.state.rev,
  });

  const result: PullResult = {
    applied: page.items.length,
    forked: forkedRows.length,
    localProjectId: target.localProjectId,
  };

  return result;
});

class SyncRunner extends Context.Service<SyncRunner, SyncRunnerApi>()(
  "design-studio/cloud/SyncRunner"
) {
  declare public readonly access: "write";

  public static readonly layer = Layer.effect(
    SyncRunner,
    Effect.gen(function* build() {
      const deps: SyncDeps = {
        bindings: yield* DeviceBindings,
        client: yield* CloudClient,
        migration: yield* CloudMigrationRunner,
        outbox: yield* OutboxStore,
      };

      const lock = yield* Semaphore.make(1);

      return SyncRunner.of({
        pullNext: (key) => lock.withPermits(1)(pullNextWith(deps, key)),
        pushPending: (key) => lock.withPermits(1)(pushPendingWith(deps, key)),
      });
    })
  );
}

export { SyncRunner };

export type { PullResult, SyncKey, SyncRunnerApi };
