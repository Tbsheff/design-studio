import type { BadRequest } from "@design-studio/actions/_core/errors/bad-request";
import type { Conflict } from "@design-studio/actions/_core/errors/conflict";
import type { NotFound } from "@design-studio/actions/_core/errors/not-found";
import { Context, Effect, Layer } from "effect";

import { ProjectStore } from "../../store/index.js";
import type { LocalOrgScope } from "../../store/index.js";
import { getEntry } from "./dev-status-entry.js";
import type { DevStatusEntry } from "./dev-status-entry.js";
import { getSavedDevStatus } from "./dev-status-file.js";
import { toNextCursor, toPageOffset } from "./engine/to-changed-files.js";

interface ListCommand {
  readonly cursor: string | null;
  readonly limit: number;
  readonly projectId: string;
  readonly status: DevStatusEntry["status"] | null;
}

interface DevStatusPage {
  readonly items: readonly DevStatusEntry[];
  readonly next: string | null;
}

interface DevStatusStoreApi {
  readonly list: (
    command: ListCommand
  ) => Effect.Effect<
    DevStatusPage,
    BadRequest | Conflict | NotFound,
    LocalOrgScope
  >;
}

class DevStatusStore extends Context.Service<
  DevStatusStore,
  DevStatusStoreApi
>()("design-studio/project-ops/DevStatusStore") {
  declare public readonly access: "read";

  public static readonly layer = Layer.effect(
    DevStatusStore,
    Effect.gen(function* build() {
      const projects = yield* ProjectStore;

      return DevStatusStore.of({
        list: Effect.fn("DevStatusStore.list")(function* run(
          command: ListCommand
        ) {
          const project = yield* projects.get(command.projectId);
          const saved = yield* getSavedDevStatus(command.projectId);

          const matching = saved.entries
            .filter(
              (record) =>
                command.status === null || record.status === command.status
            )
            .toSorted((left, right) => right.markedAt - left.markedAt);

          const offset = toPageOffset(command.cursor);
          const slice = matching.slice(offset, offset + command.limit);

          const items = yield* Effect.all(
            slice.map((record) => getEntry(project, record))
          );

          return {
            items,
            next: toNextCursor(offset, command.limit, matching.length),
          };
        }),
      });
    })
  );
}

export { DevStatusStore };

export type { DevStatusEntry, DevStatusPage, DevStatusStoreApi, ListCommand };
