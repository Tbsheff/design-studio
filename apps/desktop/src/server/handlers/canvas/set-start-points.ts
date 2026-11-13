import type { Input } from "@design-studio/actions/_core/action";
import type { setStartPointsCanvas } from "@design-studio/actions/canvas/set-start-points";
import { Effect } from "effect";

import { LinkWriter } from "../../canvas/index.js";
import type { Handle } from "../_core/handler.js";

type SetStartPointsCanvasInput = Input<typeof setStartPointsCanvas>;

const handle = Effect.fn("canvas.setStartPoints")(function* run(
  input: SetStartPointsCanvasInput
) {
  const writer = yield* LinkWriter;

  const starts = yield* writer.setStartPoints({
    projectId: input.projectId,
    starts: input.starts,
  });

  return { starts };
}) satisfies Handle<typeof setStartPointsCanvas>;

export { handle };
