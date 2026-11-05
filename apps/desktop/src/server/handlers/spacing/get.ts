import type { Input } from "@design-studio/actions/_core/action";
import type { getSpacing } from "@design-studio/actions/spacing/get";
import { Effect } from "effect";

import { SpacingStore } from "../../direct-edit/index.js";
import type { Handle } from "../_core/handler.js";

type GetSpacingInput = Input<typeof getSpacing>;

const handle = Effect.fn("spacing.get")(function* run(input: GetSpacingInput) {
  const store = yield* SpacingStore;

  const box = yield* store.get({
    computed: {
      gap: input.gap ?? "",
      margin: input.margin ?? "",
      padding: input.padding ?? "",
    },
    directionId: input.directionId,
    projectId: input.projectId,
    source: { col: input.col, file: input.file, line: input.line },
  });

  return { ...box, scale: box.scale.slice(0, input.limit) };
}) satisfies Handle<typeof getSpacing>;

export { handle };
