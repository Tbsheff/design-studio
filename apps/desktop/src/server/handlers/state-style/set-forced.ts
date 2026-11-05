import type { Input } from "@design-studio/actions/_core/action";
import type { setForcedStateStyle } from "@design-studio/actions/state-style/set-forced";
import { Effect } from "effect";

import { StateStyleWriter } from "../../state-styles/index.js";
import type { Handle } from "../_core/handler.js";

type SetForcedStateStyleInput = Input<typeof setForcedStateStyle>;

const handle = Effect.fn("state-style.setForced")(function* run(
  input: SetForcedStateStyleInput
) {
  const writer = yield* StateStyleWriter;

  return yield* writer.setForced({
    directionId: input.directionId,
    frameId: input.frameId ?? null,
    layer: input.layer ?? null,
    projectId: input.projectId,
    state: input.state,
  });
}) satisfies Handle<typeof setForcedStateStyle>;

export { handle };
