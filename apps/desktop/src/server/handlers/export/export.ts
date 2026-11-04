import { Effect } from "effect";

import type { Input } from "@design-studio/actions/_core/action";
import type { exportExport } from "@design-studio/actions/export/export";
import { ExportWriter } from "../../export/index.js";
import type { Handle } from "../_core/handler.js";

type ExportExportInput = Input<typeof exportExport>;

const handle = Effect.fn("export.export")(function* run(
  input: ExportExportInput
) {
  const writer = yield* ExportWriter;

  return yield* writer.file({
    format: input.format,
    frames: input.frames ?? null,
    projectId: input.projectId,
    scale: input.scale ?? null,
    scope: input.scope ?? null,
    selector: input.selector ?? null,
    versionId: input.versionId,
  });
}) satisfies Handle<typeof exportExport>;

export { handle };
