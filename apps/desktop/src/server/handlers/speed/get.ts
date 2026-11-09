import type { Input } from "@design-studio/actions/_core/action";
import type { getSpeed } from "@design-studio/actions/speed/get";
import { Effect } from "effect";

import { SpeedStore } from "../../preview/index.js";
import type { Handle } from "../_core/handler.js";

type GetSpeedInput = Input<typeof getSpeed>;

const handle = Effect.fn("speed.get")(function* run(input: GetSpeedInput) {
  const store = yield* SpeedStore;

  return yield* store.get({
    directionId: input.directionId,
    frameId: input.frameId,
    projectId: input.projectId,
  });
}) satisfies Handle<typeof getSpeed>;

export { handle };
