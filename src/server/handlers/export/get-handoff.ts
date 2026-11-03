import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { getHandoffExport } from "../../../shared/actions/export/get-handoff.js";
import { ExportStore } from "../../export/index.js";
import type { Handle } from "../_core/handler.js";

type GetHandoffExportInput = Input<typeof getHandoffExport>;

const handle = Effect.fn("export.getHandoff")(function* run(
  input: GetHandoffExportInput
) {
  const store = yield* ExportStore;

  return yield* store.handoffZip(input);
}) satisfies Handle<typeof getHandoffExport>;

export { handle };
