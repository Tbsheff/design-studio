import type { Input } from "@design-studio/actions/_core/action";
import type { listFont } from "@design-studio/actions/font/list";
import { Effect } from "effect";

import { FontStore } from "../../design-system/index.js";
import type { Handle } from "../_core/handler.js";

type ListFontInput = Input<typeof listFont>;

const handle = Effect.fn("font.list")(function* run(input: ListFontInput) {
  const store = yield* FontStore;

  return yield* store.list({
    cursor: input.cursor,
    directionId: input.directionId,
    limit: input.limit,
    projectId: input.projectId,
  });
}) satisfies Handle<typeof listFont>;

export { handle };
