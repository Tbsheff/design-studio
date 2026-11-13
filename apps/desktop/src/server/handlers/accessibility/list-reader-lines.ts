import type { Input } from "@design-studio/actions/_core/action";
import type { listReaderLinesAccessibility } from "@design-studio/actions/accessibility/list-reader-lines";
import { Effect } from "effect";

import { ReaderLineStore } from "../../review/index.js";
import type { Handle } from "../_core/handler.js";

type ListReaderLinesAccessibilityInput = Input<
  typeof listReaderLinesAccessibility
>;

const handle = Effect.fn("accessibility.listReaderLines")(function* run(
  input: ListReaderLinesAccessibilityInput
) {
  const store = yield* ReaderLineStore;

  return yield* store.list({
    cursor: input.cursor,
    directionId: input.directionId,
    frame: input.frame,
    limit: input.limit,
    projectId: input.projectId,
  });
}) satisfies Handle<typeof listReaderLinesAccessibility>;

export { handle };
