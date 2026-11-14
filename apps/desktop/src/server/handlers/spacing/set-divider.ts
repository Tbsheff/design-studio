import type { Input } from "@design-studio/actions/_core/action";
import type { setDividerSpacing } from "@design-studio/actions/spacing/set-divider";
import { Effect } from "effect";

import { DividerWriter } from "../../style-scope/index.js";
import type { Handle } from "../_core/handler.js";

type SetDividerSpacingInput = Input<typeof setDividerSpacing>;

const handle = Effect.fn("spacing.setDivider")(function* run(
  input: SetDividerSpacingInput
) {
  const writer = yield* DividerWriter;
  const { divider, target } = input;

  return yield* writer.set({
    directionId: input.directionId,
    paint: {
      axis: divider.axis,
      color: divider.color ?? null,
      token: divider.token ?? null,
      width: divider.width,
    },
    projectId: input.projectId,
    target: {
      selector: target.selector ?? null,
      source: target.source,
      tag: target.tag ?? null,
    },
    variant: input.variant,
  });
}) satisfies Handle<typeof setDividerSpacing>;

export { handle };
