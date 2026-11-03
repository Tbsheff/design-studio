import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { getCodeExport } from "../../../shared/actions/export/get-code.js";
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
