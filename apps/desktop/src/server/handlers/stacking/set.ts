import type { Input } from "@design-studio/actions/_core/action";
import type { setStacking } from "@design-studio/actions/stacking/set";
import { Effect, Struct } from "effect";

import { StackingWriter } from "../../share/index.js";
import type { Handle } from "../_core/handler.js";

type SetStackingInput = Input<typeof setStacking>;

const handle = Effect.fn("stacking.set")(function* run(
  input: SetStackingInput
) {
  const writer = yield* StackingWriter;
  const { directionId, others: changes, projectId, target, ...fields } = input;

  const others = changes.map((other) => ({
    fields: Struct.omit(other, ["target"]),
    selector: other.target.selector ?? null,
    source: other.target.source,
    tag: other.target.tag ?? null,
  }));

  return yield* writer.set({
    directionId,
    fields,
    others,
    projectId,
    selector: target.selector ?? null,
    source: target.source,
    tag: target.tag ?? null,
  });
}) satisfies Handle<typeof setStacking>;

export { handle };
