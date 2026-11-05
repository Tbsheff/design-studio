import type { Input } from "@design-studio/actions/_core/action";
import type { setGrid } from "@design-studio/actions/grid/set";
import { Effect } from "effect";

import { GridWriter } from "../../direct-edit/index.js";
import type { Handle } from "../_core/handler.js";

type SetGridInput = Input<typeof setGrid>;

const handle = Effect.fn("grid.set")(function* run(input: SetGridInput) {
  const writer = yield* GridWriter;
  const { directionId, projectId, target, ...fields } = input;

  return yield* writer.set({
    directionId,
    fields,
    projectId,
    selector: target.selector ?? null,
    source: target.source,
    tag: target.tag ?? null,
  });
}) satisfies Handle<typeof setGrid>;

export { handle };
