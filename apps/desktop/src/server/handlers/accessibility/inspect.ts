import type { Input } from "@design-studio/actions/_core/action";
import type { inspectAccessibility } from "@design-studio/actions/accessibility/inspect";
import { Effect } from "effect";

import { AccessibilityStore } from "../../review/index.js";
import type { Handle } from "../_core/handler.js";

type InspectAccessibilityInput = Input<typeof inspectAccessibility>;

const handle = Effect.fn("accessibility.inspect")(function* run(
  input: InspectAccessibilityInput
) {
  const store = yield* AccessibilityStore;

  return yield* store.inspect({
    directionId: input.directionId,
    frame: input.frame,
    isPassingIncluded: input.includePassing,
    limit: input.limit,
    projectId: input.projectId,
    selector: input.selector,
  });
}) satisfies Handle<typeof inspectAccessibility>;

export { handle };
