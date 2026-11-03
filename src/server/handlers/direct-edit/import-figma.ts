import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { importFigmaDirectEdit } from "../../../shared/actions/direct-edit/import-figma.js";
import { DirectEditWriter, toBody, toRef } from "../../direct-edit/index.js";
import type { Handle } from "../_core/handler.js";

type ImportFigmaDirectEditInput = Input<typeof importFigmaDirectEdit>;

const handle = Effect.fn("direct-edit.importFigma")(function* run(
  input: ImportFigmaDirectEditInput
) {
  const service = yield* DirectEditWriter;

  return yield* service.importFigma(toRef(input), toBody(input));
}) satisfies Handle<typeof importFigmaDirectEdit>;

export { handle };
