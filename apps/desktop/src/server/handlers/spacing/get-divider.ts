import type { Input } from "@design-studio/actions/_core/action";
import type { getDividerSpacing } from "@design-studio/actions/spacing/get-divider";
import { Effect } from "effect";

import { DividerStore } from "../../style-scope/index.js";
import type { Handle } from "../_core/handler.js";

type GetDividerSpacingInput = Input<typeof getDividerSpacing>;

const handle = Effect.fn("spacing.getDivider")(function* run(
  input: GetDividerSpacingInput
) {
  const store = yield* DividerStore;

  const info = yield* store.get({
    directionId: input.directionId,
    projectId: input.projectId,
    source: { col: input.col, file: input.file, line: input.line },
    variant: input.variant,
  });

  return { ...info, classes: [...info.classes] };
}) satisfies Handle<typeof getDividerSpacing>;

export { handle };
