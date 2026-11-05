import type { Input } from "@design-studio/actions/_core/action";
import type { inspectStateStyle } from "@design-studio/actions/state-style/inspect";
import { Effect } from "effect";

import { StateStyleStore } from "../../state-styles/index.js";
import type { Handle } from "../_core/handler.js";

type InspectStateStyleInput = Input<typeof inspectStateStyle>;

const handle = Effect.fn("state-style.inspect")(function* run(
  input: InspectStateStyleInput
) {
  const store = yield* StateStyleStore;

  const info = yield* store.inspect({
    directionId: input.directionId,
    projectId: input.projectId,
    source: { col: input.col, file: input.file, line: input.line },
  });

  return {
    ...info,
    forced: info.forced.slice(0, input.limit),
    states: info.states.slice(0, input.limit),
  };
}) satisfies Handle<typeof inspectStateStyle>;

export { handle };
