import type { Input } from "@design-studio/actions/_core/action";
import type { exportFrameExport } from "@design-studio/actions/export/export-frame";
import { Effect } from "effect";

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
