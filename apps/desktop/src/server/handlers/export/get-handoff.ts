import type { Input } from "@design-studio/actions/_core/action";
import type { getHandoffExport } from "@design-studio/actions/export/get-handoff";
import { Effect } from "effect";

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
