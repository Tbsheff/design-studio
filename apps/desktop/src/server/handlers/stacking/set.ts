import type { Input } from "@design-studio/actions/_core/action";
import type { setStacking } from "@design-studio/actions/stacking/set";
import { Effect } from "effect";

import { StackingWriter } from "../../components/index.js";
import type { Handle } from "../_core/handler.js";

type SetStackingInput = Input<typeof setStacking>;

const handle = Effect.fn("stacking.set")(function* run(
  input: SetStackingInput
) {
  const writer = yield* StackingWriter;
  const { directionId, projectId, target, ...fields } = input;

  return yield* writer.set({
    directionId,
    fields,
    projectId,
    selector: target.selector ?? null,
    source: target.source,
    tag: target.tag ?? null,
  });
}) satisfies Handle<typeof setStacking>;

export { handle };
