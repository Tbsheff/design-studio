import { Context, Effect, Layer } from "effect";

import type { ApprovalCard } from "@design-studio/actions/_core/approval-card";
import type {
  CopyCodeResult,
  ExportFileResult,
} from "@design-studio/actions/export/schema";
import { readCode } from "./copy-target.js";
import type { CopyQuery } from "./copy-target.js";
import { attemptExport } from "./export-core.js";
import type { ExportError } from "./export-core.js";
import { readHandoffZip } from "./export-runs.js";
import { toFolderCard } from "./folder-export.js";
import type { FolderQuery } from "./folder-export.js";

interface HandoffQuery {
  readonly folder: string;
  readonly projectId: string;
}

interface ExportStoreApi {
  readonly code: (
    query: CopyQuery
  ) => Effect.Effect<CopyCodeResult, ExportError>;
  readonly folderCard: (
    query: FolderQuery
  ) => Effect.Effect<ApprovalCard, ExportError>;
  readonly handoffZip: (
    query: HandoffQuery
  ) => Effect.Effect<ExportFileResult, ExportError>;
}

class ExportStore extends Context.Service<ExportStore, ExportStoreApi>()(
  "design-studio/export/ExportStore"
) {
  declare public readonly access: "read";

  public static readonly layer = Layer.succeed(
    ExportStore,
    ExportStore.of({
      code: Effect.fn("ExportStore.code")(function* run(query: CopyQuery) {
        return yield* attemptExport((runtime) => readCode(runtime, query));
      }),
      folderCard: Effect.fn("ExportStore.folderCard")(function* run(
        query: FolderQuery
      ) {
        return yield* attemptExport((runtime) => toFolderCard(runtime, query));
      }),
      handoffZip: Effect.fn("ExportStore.handoffZip")(function* run(
        query: HandoffQuery
      ) {
        return yield* attemptExport((runtime) =>
          readHandoffZip(runtime, query.projectId, query.folder)
        );
      }),
    })
  );
}

export { ExportStore };

export type { ExportStoreApi };
