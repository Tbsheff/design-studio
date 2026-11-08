import { NotFound } from "@design-studio/actions/_core/errors/not-found";
import { Effect } from "effect";

import { getSavedDevNotes, setSavedDevNotes } from "./dev-note-file.js";
import type { DevNoteRecord } from "./dev-note-file.js";

const toMissingNote = (noteId: string): NotFound =>
  new NotFound({
    message: `No dev note ${noteId}. Call list_dev_note for the note ids.`,
  });

const addSavedNote = Effect.fn("DevNoteSave.add")(function* run(
  projectId: string,
  toRecord: (number: number) => DevNoteRecord
) {
  const saved = yield* getSavedDevNotes(projectId);
  const record = toRecord(saved.nextNumber);

  yield* setSavedDevNotes(projectId, {
    nextNumber: saved.nextNumber + 1,
    notes: [...saved.notes, record],
  });

  return record;
});

const removeSavedNote = Effect.fn("DevNoteSave.remove")(function* run(
  projectId: string,
  noteId: string
) {
  const saved = yield* getSavedDevNotes(projectId);
  const found = saved.notes.find((note) => note.id === noteId) ?? null;

  if (found === null) {
    return yield* toMissingNote(noteId);
  }

  yield* setSavedDevNotes(projectId, {
    nextNumber: saved.nextNumber,
    notes: saved.notes.filter((note) => note.id !== noteId),
  });

  return found;
});

const replaceSavedNote = Effect.fn("DevNoteSave.replace")(function* run(
  projectId: string,
  noteId: string,
  toNext: (latest: DevNoteRecord) => DevNoteRecord
) {
  const saved = yield* getSavedDevNotes(projectId);
  const latest = saved.notes.find((note) => note.id === noteId) ?? null;

  if (latest === null) {
    return yield* toMissingNote(noteId);
  }

  const next = toNext(latest);

  yield* setSavedDevNotes(projectId, {
    nextNumber: saved.nextNumber,
    notes: saved.notes.map((note) => {
      if (note.id === noteId) {
        return next;
      }

      return note;
    }),
  });

  return next;
});

export { addSavedNote, removeSavedNote, replaceSavedNote, toMissingNote };
