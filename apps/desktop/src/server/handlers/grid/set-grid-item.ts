import type { Input } from "@design-studio/actions/_core/action";
import type { setGridItemGrid } from "@design-studio/actions/grid/set-grid-item";
import { Effect } from "effect";

import { GridWriter } from "../../style-scope/index.js";
import type { Handle } from "../_core/handler.js";

type SetGridItemGridInput = Input<typeof setGridItemGrid>;

const handle = Effect.fn("grid.setGridItem")(function* run(
  input: SetGridItemGridInput
) {
  const writer = yield* GridWriter;
  const { directionId, projectId, target, ...fields } = input;

  return yield* writer.setItem({
    directionId,
    fields,
    projectId,
    selector: target.selector ?? null,
    source: target.source,
    tag: target.tag ?? null,
  });
}) satisfies Handle<typeof setGridItemGrid>;

export { handle };
