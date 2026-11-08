import type { BadRequest } from "@design-studio/actions/_core/errors/bad-request";
import type { Conflict } from "@design-studio/actions/_core/errors/conflict";
import type { NotFound } from "@design-studio/actions/_core/errors/not-found";
import { Context, Effect, Layer } from "effect";

import { CanvasStore } from "../../canvas/index.js";
import { ProjectStore } from "../../store/index.js";
import type { LocalOrgScope } from "../../store/index.js";
import { toEntry } from "./dev-status-entry.js";
import type { DevStatusEntry } from "./dev-status-entry.js";
import { getSavedDevStatus, setSavedDevStatus } from "./dev-status-file.js";
import type { DevStatusRecord } from "./dev-status-file.js";
import { loadFrameTarget } from "./dev-status-frame.js";

interface SetCommand {
  readonly frameId: string;
  readonly note: string | null;
  readonly projectId: string;
  readonly status: DevStatusEntry["status"];
}

interface DevStatusWriterApi {
  readonly set: (
    command: SetCommand
  ) => Effect.Effect<
    DevStatusEntry,
    BadRequest | Conflict | NotFound,
    LocalOrgScope
  >;
}

class DevStatusWriter extends Context.Service<
  DevStatusWriter,
  DevStatusWriterApi
>()("design-studio/project-ops/DevStatusWriter") {
  declare public readonly access: "write";

  public static readonly layer = Layer.effect(
    DevStatusWriter,
    Effect.gen(function* build() {
      const projects = yield* ProjectStore;
      const canvases = yield* CanvasStore;

      return DevStatusWriter.of({
        set: Effect.fn("DevStatusWriter.set")(function* run(
          command: SetCommand
        ) {
          const project = yield* projects.get(command.projectId);
          const doc = yield* canvases.getDoc(command.projectId);

          const target = yield* loadFrameTarget(
            project,
            doc.canvas?.frames ?? [],
            command.frameId
          );

          const record: DevStatusRecord = {
            directionId: target.direction.id,
            files: target.files,
            frameId: command.frameId,
            markedAt: Date.now(),
            markedVersionId: target.direction.headVersionId,
            note: command.note,
            page: target.page,
            route: target.route,
            status: command.status,
          };

          const saved = yield* getSavedDevStatus(command.projectId);

          yield* setSavedDevStatus(command.projectId, {
            entries: [
              ...saved.entries.filter(
                (item) => item.frameId !== command.frameId
              ),
              record,
            ],
          });

          return toEntry(record, []);
        }),
      });
    })
  );
}

export { DevStatusWriter };

export type { DevStatusWriterApi, SetCommand };
