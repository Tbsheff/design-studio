import type { Input } from "@design-studio/actions/_core/action";
import type { getGrid } from "@design-studio/actions/grid/get";
import { Effect } from "effect";

import { GridStore } from "../../style-scope/index.js";
import type { Handle } from "../_core/handler.js";

type GetGridInput = Input<typeof getGrid>;

const handle = Effect.fn("grid.get")(function* run(input: GetGridInput) {
  const store = yield* GridStore;

  return yield* store.get({
    breakpoint: input.breakpoint,
    directionId: input.directionId,
    limit: input.limit,
    projectId: input.projectId,
    source: { col: input.col, file: input.file, line: input.line },
  });
}) satisfies Handle<typeof getGrid>;

export { handle };
