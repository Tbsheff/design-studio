import type { Input } from "@design-studio/actions/_core/action";
import type { setGuidesCanvas } from "@design-studio/actions/canvas/set-guides";
import { Effect } from "effect";

import { CanvasWriter } from "../../canvas/index.js";
import type { Handle } from "../_core/handler.js";

type SetGuidesCanvasInput = Input<typeof setGuidesCanvas>;

const handle = Effect.fn("canvas.setGuides")(function* run(
  input: SetGuidesCanvasInput
) {
  const writer = yield* CanvasWriter;

  return yield* writer.setGuides({
    guides: input.guides,
    projectId: input.projectId,
  });
}) satisfies Handle<typeof setGuidesCanvas>;

export { handle };
