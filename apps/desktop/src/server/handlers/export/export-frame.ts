import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { exportFrameExport } from "../../../shared/actions/export/export-frame.js";
import { ExportWriter } from "../../export/index.js";
import type { Handle } from "../_core/handler.js";

type ExportFrameExportInput = Input<typeof exportFrameExport>;

const handle = Effect.fn("export.exportFrame")(function* run(
  input: ExportFrameExportInput
) {
  const writer = yield* ExportWriter;

  return yield* writer.frame(input);
}) satisfies Handle<typeof exportFrameExport>;

export { handle };
