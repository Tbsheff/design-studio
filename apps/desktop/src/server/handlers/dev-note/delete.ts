import type { Input } from "@design-studio/actions/_core/action";
import type { deleteDevNote } from "@design-studio/actions/dev-note/delete";
import { Effect } from "effect";

import { DevNoteStore, DevNoteWriter } from "../../comments/index.js";
import type { Handle, Preview } from "../_core/handler.js";

type DeleteDevNoteInput = Input<typeof deleteDevNote>;

const MAX_CARD_TEXT = 200;

const toCardText = (text: string): string => {
  const flat = text.replaceAll(/\s+/gu, " ").trim();

  if (flat.length <= MAX_CARD_TEXT) {
    return flat;
  }

  return `${flat.slice(0, MAX_CARD_TEXT)}...`;
};

const handle = Effect.fn("dev-note.delete")(function* run(
  input: DeleteDevNoteInput
) {
  const writer = yield* DevNoteWriter;
  const removed = yield* writer.remove(input.projectId, input.noteId);

  return { id: removed.id, text: removed.text };
}) satisfies Handle<typeof deleteDevNote>;

const preview = Effect.fn("dev-note.delete.preview")(function* card(
  input: DeleteDevNoteInput
) {
  const store = yield* DevNoteStore;
  const note = yield* store.get(input.projectId, input.noteId);

  return {
    action: "Delete a dev note",
    detail: `Dev note ${note.number} on frame ${note.frameId}: ${toCardText(note.text)} This cannot be undone.`,
    title: `Delete dev note ${note.number}`,
  };
}) satisfies Preview<typeof deleteDevNote>;

export { handle, preview };
