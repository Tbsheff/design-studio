import type { Input } from "@design-studio/actions/_core/action";
import type { setStateStyle } from "@design-studio/actions/state-style/set";
import { Effect } from "effect";

import { StateStyleWriter } from "../../state-styles/index.js";
import type { Handle } from "../_core/handler.js";

type SetStateStyleInput = Input<typeof setStateStyle>;

const handle = Effect.fn("state-style.set")(function* run(
  input: SetStateStyleInput
) {
  const writer = yield* StateStyleWriter;
  const { directionId, projectId, target, ...fields } = input;

  return yield* writer.set({
    directionId,
    fields,
    projectId,
    selector: target.selector ?? null,
    source: target.source,
    tag: target.tag ?? null,
  });
}) satisfies Handle<typeof setStateStyle>;

export { handle };
