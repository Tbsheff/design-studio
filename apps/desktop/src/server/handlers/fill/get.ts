import type { Input } from "@design-studio/actions/_core/action";
import type { getFill } from "@design-studio/actions/fill/get";
import { Effect } from "effect";

import { FillStore } from "../../style-scope/index.js";
import type { Handle } from "../_core/handler.js";

type GetFillInput = Input<typeof getFill>;

const handle = Effect.fn("fill.get")(function* run(input: GetFillInput) {
  const store = yield* FillStore;

  const info = yield* store.get({
    directionId: input.directionId,
    projectId: input.projectId,
    source: { col: input.col, file: input.file, line: input.line },
    variant: input.variant,
  });

  return {
    ...info,
    blend: info.blend.slice(0, input.limit),
    classes: info.classes.slice(0, input.limit),
  };
}) satisfies Handle<typeof getFill>;

export { handle };
