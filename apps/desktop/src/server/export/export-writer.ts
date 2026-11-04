import { Context, Effect, Layer } from "effect";

import type {
  ExportFileResult,
  FolderExportResult,
  FrameExportResult,
  HandoffFolderResult,
} from "../../shared/actions/export/schema.js";
import { attemptExport } from "./export-core.js";
import type { ExportError } from "./export-core.js";
import type { FileRequest } from "./export-file.js";
import { runFileExport, runHandoff } from "./export-runs.js";
import type { HandoffRequest } from "./export-runs.js";
import { runFolderExport, runFrameExport } from "./folder-export.js";
import type { FolderQuery, FrameQuery } from "./folder-export.js";

interface ExportWriterApi {
  readonly file: (
    request: FileRequest
  ) => Effect.Effect<ExportFileResult, ExportError>;
  readonly folder: (
    query: FolderQuery
  ) => Effect.Effect<FolderExportResult, ExportError>;
  readonly frame: (
    query: FrameQuery
  ) => Effect.Effect<FrameExportResult, ExportError>;
  readonly handoff: (
    request: HandoffRequest
  ) => Effect.Effect<HandoffFolderResult, ExportError>;
}

class ExportWriter extends Context.Service<ExportWriter, ExportWriterApi>()(
  "design-studio/export/ExportWriter"
) {
  declare public readonly access: "write";

  public static readonly layer = Layer.succeed(
    ExportWriter,
    ExportWriter.of({
      file: Effect.fn("ExportWriter.file")(function* run(request: FileRequest) {
        return yield* attemptExport((runtime) =>
          runFileExport(runtime, request)
        );
      }),
      folder: Effect.fn("ExportWriter.folder")(function* run(
        query: FolderQuery
      ) {
        return yield* attemptExport((runtime) =>
          runFolderExport(runtime, query)
        );
      }),
      frame: Effect.fn("ExportWriter.frame")(function* run(query: FrameQuery) {
        return yield* attemptExport((runtime) =>
          runFrameExport(runtime, query)
        );
      }),
      handoff: Effect.fn("ExportWriter.handoff")(function* run(
        request: HandoffRequest
      ) {
        return yield* attemptExport((runtime) => runHandoff(runtime, request));
      }),
    })
  );
}

export { ExportWriter };

export type { ExportWriterApi };
