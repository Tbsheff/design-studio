import { randomUUID } from "node:crypto";

import type { BadRequest } from "@design-studio/actions/_core/errors/bad-request";
import type { Conflict } from "@design-studio/actions/_core/errors/conflict";
import type { NotFound } from "@design-studio/actions/_core/errors/not-found";
import { Context, Effect, Layer, Semaphore } from "effect";

import { CanvasStore } from "../../canvas/index.js";
import { ProjectStore } from "../../store/index.js";
import type { LocalOrgScope } from "../../store/index.js";
import type { DevNoteRecord } from "./dev-note-file.js";
import { getDevNoteFrame } from "./dev-note-frame.js";
import { toMeasureNote } from "./dev-note-measure-note.js";
import {
  addSavedNote,
  removeSavedNote,
  replaceSavedNote,
} from "./dev-note-save.js";
import { toNewRecord, toUpdatedRecord } from "./engine/to-note-record.js";

interface CreateNoteCommand {
  readonly frameId: string;
  readonly isMeasured: boolean;
  readonly kind: DevNoteRecord["kind"];
  readonly layerId: string | null;
  readonly projectId: string;
  readonly targetSource: string | null;
  readonly text: string;
}

interface UpdateNoteCommand {
  readonly isMeasured: boolean;
  readonly kind: DevNoteRecord["kind"] | null;
  readonly noteId: string;
  readonly projectId: string;
  readonly text: string | null;
}

type WriteFailure = BadRequest | Conflict | NotFound;

interface DevNoteWriterApi {
  readonly create: (
    command: CreateNoteCommand
  ) => Effect.Effect<DevNoteRecord, WriteFailure, LocalOrgScope>;
  readonly remove: (
    projectId: string,
    noteId: string
  ) => Effect.Effect<DevNoteRecord, WriteFailure, LocalOrgScope>;
  readonly update: (
    command: UpdateNoteCommand
  ) => Effect.Effect<DevNoteRecord, WriteFailure, LocalOrgScope>;
}

class DevNoteWriter extends Context.Service<DevNoteWriter, DevNoteWriterApi>()(
  "design-studio/comments/DevNoteWriter"
) {
  declare public readonly access: "write";

  public static readonly layer = Layer.effect(
    DevNoteWriter,
    Effect.gen(function* build() {
      const projects = yield* ProjectStore;
      const canvases = yield* CanvasStore;
      const lock = yield* Semaphore.make(1);

      const getFrame = Effect.fn("DevNoteWriter.frame")(function* run(
        projectId: string,
        frameId: string
      ) {
        const project = yield* projects.get(projectId);
        const doc = yield* canvases.getDoc(projectId);

        return yield* getDevNoteFrame(
          project,
          doc.canvas?.frames ?? [],
          frameId
        );
      });

      return DevNoteWriter.of({
        create: Effect.fn("DevNoteWriter.create")(function* run(
          command: CreateNoteCommand
        ) {
          yield* getFrame(command.projectId, command.frameId);

          const noteMeasure = yield* toMeasureNote(getFrame, command);

          return yield* lock.withPermits(1)(
            addSavedNote(command.projectId, (nextNumber) =>
              toNewRecord({
                ...command,
                id: randomUUID(),
                measured: noteMeasure,
                now: Date.now(),
                number: nextNumber,
              })
            )
          );
        }),
        remove: Effect.fn("DevNoteWriter.remove")(function* run(
          projectId: string,
          noteId: string
        ) {
          yield* projects.get(projectId);

          return yield* lock.withPermits(1)(removeSavedNote(projectId, noteId));
        }),
        update: Effect.fn("DevNoteWriter.update")(function* run(
          command: UpdateNoteCommand
        ) {
          yield* projects.get(command.projectId);

          const current = yield* replaceSavedNote(
            command.projectId,
            command.noteId,
            (latest) => latest
          );

          const noteMeasure = yield* toMeasureNote(getFrame, {
            ...current,
            isMeasured: command.isMeasured,
            projectId: command.projectId,
          });

          return yield* lock.withPermits(1)(
            replaceSavedNote(command.projectId, command.noteId, (latest) =>
              toUpdatedRecord(latest, {
                kind: command.kind,
                measured: noteMeasure,
                now: Date.now(),
                text: command.text,
              })
            )
          );
        }),
      });
    })
  );
}

export { DevNoteWriter };

export type { CreateNoteCommand, DevNoteWriterApi, UpdateNoteCommand };
