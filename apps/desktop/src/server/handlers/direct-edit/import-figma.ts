import { Effect } from "effect";

import type { Input } from "@design-studio/actions/_core/action";
import type { importFigmaDirectEdit } from "@design-studio/actions/direct-edit/import-figma";
import { DirectEditWriter, toFields, toRef } from "../../direct-edit/index.js";
import type { Handle } from "../_core/handler.js";

type ImportFigmaDirectEditInput = Input<typeof importFigmaDirectEdit>;

const handle = Effect.fn("direct-edit.importFigma")(function* run(
  input: ImportFigmaDirectEditInput
) {
  const service = yield* DirectEditWriter;

  return yield* service.importFigma(toRef(input), toFields(input));
}) satisfies Handle<typeof importFigmaDirectEdit>;

export { handle };
