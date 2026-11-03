import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { exportHandoffExport } from "../../../shared/actions/export/export-handoff.js";
import { ExportWriter } from "../../export/index.js";
import type { Handle } from "../_core/handler.js";

type ExportHandoffExportInput = Input<typeof exportHandoffExport>;

const handle = Effect.fn("export.exportHandoff")(function* run(
  input: ExportHandoffExportInput
) {
  const writer = yield* ExportWriter;

  return yield* writer.handoff({
    frames: input.frames ?? null,
    projectId: input.projectId,
    versionId: input.versionId,
  });
}) satisfies Handle<typeof exportHandoffExport>;

export { handle };
