import type { Input } from "@design-studio/actions/_core/action";
import type { setSpacing } from "@design-studio/actions/spacing/set";
import { Effect } from "effect";

import { SpacingWriter } from "../../direct-edit/index.js";
import type { Handle } from "../_core/handler.js";

type SetSpacingInput = Input<typeof setSpacing>;

const handle = Effect.fn("spacing.set")(function* run(input: SetSpacingInput) {
  const writer = yield* SpacingWriter;
  const { spacing, target } = input;

  return yield* writer.set({
    directionId: input.directionId,
    input: {
      property: spacing.property,
      side: spacing.side,
      snap: spacing.snap,
      token: spacing.token ?? null,
      value: spacing.value ?? null,
    },
    projectId: input.projectId,
    selector: target.selector ?? null,
    source: target.source,
    tag: target.tag ?? null,
  });
}) satisfies Handle<typeof setSpacing>;

export { handle };
