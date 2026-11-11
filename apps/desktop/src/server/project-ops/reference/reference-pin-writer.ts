import { BadRequest } from "@design-studio/actions/_core/errors/bad-request";
import type { Conflict } from "@design-studio/actions/_core/errors/conflict";
import { NotFound } from "@design-studio/actions/_core/errors/not-found";
import { Context, Effect, Layer } from "effect";

import { CanvasStore } from "../../canvas/index.js";
import { McpReadStore } from "../../preview/index.js";
import { ProjectStore } from "../../store/index.js";
import type { LocalOrgScope, ReferencePin } from "../../store/index.js";
import {
  deletePinShot,
  getPinSourcePath,
  getSavedPins,
  setPinShot,
  setSavedPins,
  toPinDirection,
  toPinFrame,
  toReferencePin,
  toShotQuery,
} from "./reference-pin-file.js";

interface SetPinCommand {
  readonly frameId: string;
  readonly isPinned: boolean;
  readonly projectId: string;
}

interface PinResult {
  readonly isPinned: boolean;
  readonly pin: ReferencePin | null;
}

type WriteFailure = BadRequest | Conflict | NotFound;

interface ReferencePinWriterApi {
  readonly set: (
    command: SetPinCommand
  ) => Effect.Effect<PinResult, WriteFailure, LocalOrgScope>;
}

const PIN_MAX = 12;

class ReferencePinWriter extends Context.Service<
  ReferencePinWriter,
  ReferencePinWriterApi
>()("design-studio/project-ops/ReferencePinWriter") {
  declare public readonly access: "write";

  public static readonly layer = Layer.effect(
    ReferencePinWriter,
    Effect.gen(function* build() {
      const projects = yield* ProjectStore;
      const canvas = yield* CanvasStore;
      const reads = yield* McpReadStore;

      const toPin = Effect.fn("ReferencePinWriter.toPin")(function* run(
        command: SetPinCommand
      ) {
        const project = yield* projects.get(command.projectId);
        const doc = yield* canvas.getDoc(command.projectId);
        const frame = toPinFrame(doc.canvas?.frames ?? [], command.frameId);

        if (frame === null) {
          return yield* new NotFound({
            message: `Frame ${command.frameId} is not on the canvas.`,
          });
        }

        const direction = toPinDirection(
          project.directions,
          frame.directionId ?? doc.directionId
        );

        if (direction === null) {
          return yield* new NotFound({
            message: `The direction of frame ${command.frameId} is gone.`,
          });
        }

        const png = yield* reads.screenshot(toShotQuery(command)).pipe(
          Effect.map((view) => view.data),
          Effect.catchCause(() => Effect.succeed(null))
        );

        return toReferencePin({
          direction,
          frame,
          screenshotPath: yield* setPinShot(command.projectId, frame.id, png),
          sourcePath: yield* getPinSourcePath(
            project,
            direction,
            frame.path ?? ""
          ),
        });
      });

      return ReferencePinWriter.of({
        set: Effect.fn("ReferencePinWriter.set")(function* run(
          command: SetPinCommand
        ) {
          const saved = yield* getSavedPins(command.projectId);
          const others = saved.filter((pin) => pin.id !== command.frameId);

          if (!command.isPinned) {
            yield* projects.get(command.projectId);
            yield* setSavedPins(command.projectId, others);
            yield* deletePinShot(command.projectId, command.frameId);

            return { isPinned: false, pin: null };
          }

          if (others.length >= PIN_MAX) {
            return yield* new BadRequest({
              message: `A project can pin at most ${PIN_MAX} frames. Unpin one first.`,
            });
          }

          const pin = yield* toPin(command);

          yield* setSavedPins(command.projectId, [...others, pin]);

          return { isPinned: true, pin };
        }),
      });
    })
  );
}

export { ReferencePinWriter };

export type { PinResult, ReferencePinWriterApi, SetPinCommand };
