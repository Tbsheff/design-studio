import type { Input } from "@design-studio/actions/_core/action";
import type { setReference } from "@design-studio/actions/reference/set";
import { Effect } from "effect";

import { ReferencePinWriter } from "../../project-ops/index.js";
import type { Handle } from "../_core/handler.js";

type SetReferenceInput = Input<typeof setReference>;

const handle = Effect.fn("reference.set")(function* run(
  input: SetReferenceInput
) {
  const writer = yield* ReferencePinWriter;

  return yield* writer.set({
    frameId: input.frameId,
    isPinned: input.isPinned,
    projectId: input.projectId,
  });
}) satisfies Handle<typeof setReference>;

export { handle };
