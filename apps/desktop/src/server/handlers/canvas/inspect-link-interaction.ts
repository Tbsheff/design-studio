import type { Input } from "@design-studio/actions/_core/action";
import type { inspectLinkInteractionCanvas } from "@design-studio/actions/canvas/inspect-link-interaction";
import { Effect } from "effect";

import { LinkStore } from "../../canvas/index.js";
import type { Handle } from "../_core/handler.js";

type InspectLinkInteractionCanvasInput = Input<
  typeof inspectLinkInteractionCanvas
>;

const handle = Effect.fn("canvas.inspectLinkInteraction")(function* run(
  input: InspectLinkInteractionCanvasInput
) {
  const store = yield* LinkStore;

  const listed = yield* store.interactions({
    fromFrame: input.fromFrame ?? null,
    projectId: input.projectId,
  });

  return { ...listed, items: listed.items.slice(0, input.limit) };
}) satisfies Handle<typeof inspectLinkInteractionCanvas>;

export { handle };
