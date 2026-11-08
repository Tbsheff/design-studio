import type { Input } from "@design-studio/actions/_core/action";
import type { updateDevNote } from "@design-studio/actions/dev-note/update";
import { Effect } from "effect";

import { DevNoteWriter } from "../../comments/index.js";
import type { Handle } from "../_core/handler.js";

type UpdateDevNoteInput = Input<typeof updateDevNote>;

const handle = Effect.fn("dev-note.update")(function* run(
  input: UpdateDevNoteInput
) {
  const writer = yield* DevNoteWriter;

  return yield* writer.update({
    isMeasured: input.isMeasured,
    kind: input.kind,
    noteId: input.noteId,
    projectId: input.projectId,
    text: input.text,
  });
}) satisfies Handle<typeof updateDevNote>;

export { handle };
