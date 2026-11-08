import type { Input } from "@design-studio/actions/_core/action";
import type { createDevNote } from "@design-studio/actions/dev-note/create";
import { Effect } from "effect";

import { DevNoteWriter } from "../../comments/index.js";
import type { Handle } from "../_core/handler.js";

type CreateDevNoteInput = Input<typeof createDevNote>;

const handle = Effect.fn("dev-note.create")(function* run(
  input: CreateDevNoteInput
) {
  const writer = yield* DevNoteWriter;

  return yield* writer.create({
    frameId: input.frameId,
    isMeasured: input.isMeasured,
    kind: input.kind,
    layerId: input.layerId,
    projectId: input.projectId,
    targetSource: input.targetSource,
    text: input.text,
  });
}) satisfies Handle<typeof createDevNote>;

export { handle };
