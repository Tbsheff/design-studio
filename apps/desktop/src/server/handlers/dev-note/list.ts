import type { Input } from "@design-studio/actions/_core/action";
import type { listDevNote } from "@design-studio/actions/dev-note/list";
import { Effect } from "effect";

import { DevNoteStore } from "../../comments/index.js";
import type { Handle } from "../_core/handler.js";

type ListDevNoteInput = Input<typeof listDevNote>;

const handle = Effect.fn("dev-note.list")(function* run(
  input: ListDevNoteInput
) {
  const store = yield* DevNoteStore;

  return yield* store.list({
    cursor: input.cursor,
    frameId: input.frameId,
    limit: input.limit,
    projectId: input.projectId,
  });
}) satisfies Handle<typeof listDevNote>;

export { handle };
