import { Effect } from "effect";

import type { Input } from "@design-studio/actions/_core/action";
import type { getCodeExport } from "@design-studio/actions/export/get-code";
import { ExportStore } from "../../export/index.js";
import type { Handle } from "../_core/handler.js";

type GetCodeExportInput = Input<typeof getCodeExport>;

const handle = Effect.fn("export.getCode")(function* run(
  input: GetCodeExportInput
) {
  const store = yield* ExportStore;

  return yield* store.code(input);
}) satisfies Handle<typeof getCodeExport>;

export { handle };
