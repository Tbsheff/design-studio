import type { Input } from "@design-studio/actions/_core/action";
import type { setAccessibility } from "@design-studio/actions/accessibility/set";
import { Effect } from "effect";

import { AccessibilityWriter } from "../../review/index.js";
import type { Handle } from "../_core/handler.js";

type SetAccessibilityInput = Input<typeof setAccessibility>;

const handle = Effect.fn("accessibility.set")(function* run(
  input: SetAccessibilityInput
) {
  const writer = yield* AccessibilityWriter;
  const { directionId, projectId, target, ...fields } = input;

  return yield* writer.set({
    directionId,
    fields,
    projectId,
    source: target.source,
    tag: target.tag ?? null,
    usedAt: target.usedAt ?? null,
  });
}) satisfies Handle<typeof setAccessibility>;

export { handle };
