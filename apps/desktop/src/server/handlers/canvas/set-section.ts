import type { Input } from "@design-studio/actions/_core/action";
import type { setSectionCanvas } from "@design-studio/actions/canvas/set-section";
import { Effect } from "effect";

import { CanvasWriter } from "../../canvas/index.js";
import type { Handle } from "../_core/handler.js";

type SetSectionCanvasInput = Input<typeof setSectionCanvas>;

const handle = Effect.fn("canvas.setSection")(function* run(
  input: SetSectionCanvasInput
) {
  const writer = yield* CanvasWriter;

  return yield* writer.setSection({
    directionId: input.directionId ?? null,
    frameIds: input.frameIds,
    height: input.height,
    label: input.label,
    projectId: input.projectId,
    section: input.section,
    width: input.width,
    x: input.x,
    y: input.y,
  });
}) satisfies Handle<typeof setSectionCanvas>;

export { handle };
