import type { Input } from "@design-studio/actions/_core/action";
import type { setFrameHeightsCanvas } from "@design-studio/actions/canvas/set-frame-heights";
import { Effect } from "effect";

import { FrameFitWriter } from "../../canvas/index.js";
import type { Handle } from "../_core/handler.js";

type SetFrameHeightsCanvasInput = Input<typeof setFrameHeightsCanvas>;

const handle = Effect.fn("canvas.setFrameHeights")(function* run(
  input: SetFrameHeightsCanvasInput
) {
  const writer = yield* FrameFitWriter;

  return yield* writer.setFrameHeights({
    directionId: input.directionId ?? null,
    frames: input.frames,
    projectId: input.projectId,
  });
}) satisfies Handle<typeof setFrameHeightsCanvas>;

export { handle };
