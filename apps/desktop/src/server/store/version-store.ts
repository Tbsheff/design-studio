import type { Version, VersionChanges } from "@design-studio/contracts";
import { Context, Effect, Layer } from "effect";

import { attemptVersionRead } from "./version-read-core.js";
import type { VersionReadError } from "./version-read-core.js";
import { exportVersionZip, inspectPreview } from "./version-read-export.js";
import type {
  VersionExportView,
  VersionPreviewView,
} from "./version-read-export.js";
import {
  readChanges,
  readHistory,
  readHunks,
  readVersion,
  readVersionList,
} from "./version-read.js";
import type {
  ChangesQuery,
  DirectionQuery,
  HistoryQuery,
  HistoryView,
  HunkList,
  HunkQuery,
} from "./version-read.js";

interface VersionStoreApi {
  readonly changes: (
    query: ChangesQuery
  ) => Effect.Effect<VersionChanges, VersionReadError>;
  readonly export: (
    projectId: string,
    versionId: string
  ) => Effect.Effect<VersionExportView, VersionReadError>;
  readonly get: (
    projectId: string,
    versionId: string
  ) => Effect.Effect<Version, VersionReadError>;
  readonly history: (
    query: HistoryQuery
  ) => Effect.Effect<HistoryView, VersionReadError>;
  readonly hunks: (
    query: HunkQuery
  ) => Effect.Effect<HunkList, VersionReadError>;
  readonly list: (
    query: DirectionQuery
  ) => Effect.Effect<readonly Version[], VersionReadError>;
  readonly preview: (
    projectId: string,
    versionId: string
  ) => Effect.Effect<VersionPreviewView, VersionReadError>;
}

class VersionStore extends Context.Service<VersionStore, VersionStoreApi>()(
  "design-studio/store/VersionStore"
) {
  declare public readonly access: "read";

  public static readonly layer = Layer.succeed(
    VersionStore,
    VersionStore.of({
      changes: Effect.fn("VersionStore.changes")(function* run(
        query: ChangesQuery
      ) {
        return yield* attemptVersionRead((runtime) =>
          readChanges(runtime, query)
        );
      }),
      export: Effect.fn("VersionStore.export")(function* run(
        projectId: string,
        versionId: string
      ) {
        return yield* attemptVersionRead((runtime) =>
          exportVersionZip(runtime, projectId, versionId)
        );
      }),
      get: Effect.fn("VersionStore.get")(function* run(
        projectId: string,
        versionId: string
      ) {
        return yield* attemptVersionRead((runtime) =>
          readVersion(runtime, projectId, versionId)
        );
      }),
      history: Effect.fn("VersionStore.history")(function* run(
        query: HistoryQuery
      ) {
        return yield* attemptVersionRead((runtime) =>
          readHistory(runtime, query)
        );
      }),
      hunks: Effect.fn("VersionStore.hunks")(function* run(query: HunkQuery) {
        return yield* attemptVersionRead((runtime) =>
          readHunks(runtime, query)
        );
      }),
      list: Effect.fn("VersionStore.list")(function* run(
        query: DirectionQuery
      ) {
        return yield* attemptVersionRead((runtime) =>
          readVersionList(runtime, query)
        );
      }),
      preview: Effect.fn("VersionStore.preview")(function* run(
        projectId: string,
        versionId: string
      ) {
        return yield* attemptVersionRead((runtime) =>
          inspectPreview(runtime, projectId, versionId)
        );
      }),
    })
  );
}

export { VersionStore };

export type { VersionStoreApi };
