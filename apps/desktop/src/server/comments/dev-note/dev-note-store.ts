import type { BadRequest } from "@design-studio/actions/_core/errors/bad-request";
import type { Conflict } from "@design-studio/actions/_core/errors/conflict";
import { NotFound } from "@design-studio/actions/_core/errors/not-found";
import { Context, Effect, Layer } from "effect";

import { ProjectStore } from "../../store/index.js";
import type { LocalOrgScope } from "../../store/index.js";
import { getSavedDevNotes } from "./dev-note-file.js";
import type { DevNoteRecord } from "./dev-note-file.js";
import { toNotePage } from "./engine/to-note-page.js";
import type { PageSlice } from "./engine/to-note-page.js";

interface ListNotesCommand {
  readonly cursor: string | null;
  readonly frameId: string | null;
  readonly limit: number;
  readonly projectId: string;
}

interface DevNoteStoreApi {
  readonly get: (
    projectId: string,
    noteId: string
  ) => Effect.Effect<
    DevNoteRecord,
    BadRequest | Conflict | NotFound,
    LocalOrgScope
  >;
  readonly list: (
    command: ListNotesCommand
  ) => Effect.Effect<
    PageSlice<DevNoteRecord>,
    BadRequest | Conflict | NotFound,
    LocalOrgScope
  >;
}

class DevNoteStore extends Context.Service<DevNoteStore, DevNoteStoreApi>()(
  "design-studio/comments/DevNoteStore"
) {
  declare public readonly access: "read";

  public static readonly layer = Layer.effect(
    DevNoteStore,
    Effect.gen(function* build() {
      const projects = yield* ProjectStore;

      return DevNoteStore.of({
        get: Effect.fn("DevNoteStore.get")(function* run(
          projectId: string,
          noteId: string
        ) {
          yield* projects.get(projectId);
          const saved = yield* getSavedDevNotes(projectId);
          const found = saved.notes.find((note) => note.id === noteId) ?? null;

          if (found === null) {
            return yield* new NotFound({
              message: `No dev note ${noteId}. Call list_dev_note for the note ids.`,
            });
          }

          return found;
        }),
        list: Effect.fn("DevNoteStore.list")(function* run(
          command: ListNotesCommand
        ) {
          yield* projects.get(command.projectId);
          const saved = yield* getSavedDevNotes(command.projectId);

          const matching = saved.notes
            .filter(
              (note) =>
                command.frameId === null || note.frameId === command.frameId
            )
            .toSorted((left, right) => left.number - right.number);

          return toNotePage(matching, command.cursor, command.limit);
        }),
      });
    })
  );
}

export { DevNoteStore };

export type { DevNoteStoreApi, ListNotesCommand };
