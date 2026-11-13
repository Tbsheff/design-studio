import { NotFound } from "@design-studio/actions/_core/errors/not-found";
import type { PageSource } from "@design-studio/actions/page/source/schema";
import { Context, Effect, Layer } from "effect";

import type { KnownFailure } from "../../platform/attempt/index.js";
import { ProjectStore } from "../../store/index.js";
import type { LocalOrgScope } from "../../store/index.js";
import { toChangedFiles } from "./engine/to-changed-files.js";
import {
  getRecord,
  hasPage,
  toEntryOf,
  toShaMap,
} from "./route-source-file.js";
import type { RouteSourceEntry } from "./route-source-file.js";
import { toAppWorkTree, toWorkTree } from "./route-source-target.js";
import type { SourcePageCommand } from "./route-source-target.js";

interface RouteSourceStoreApi {
  readonly get: (
    command: SourcePageCommand
  ) => Effect.Effect<RouteSourceEntry | null, KnownFailure, LocalOrgScope>;
  readonly inspect: (
    command: SourcePageCommand
  ) => Effect.Effect<PageSource, KnownFailure, LocalOrgScope>;
}

const NOT_A_COPY: PageSource = {
  appProjectId: null,
  changedFiles: [],
  copiedAt: null,
  isChanged: false,
  isRouteCopy: false,
  routePath: null,
};

class RouteSourceStore extends Context.Service<
  RouteSourceStore,
  RouteSourceStoreApi
>()("design-studio/project-ops/RouteSourceStore") {
  declare public readonly access: "read";

  public static readonly layer = Layer.effect(
    RouteSourceStore,
    Effect.gen(function* build() {
      const projects = yield* ProjectStore;

      const toEntry = Effect.fn("RouteSourceStore.toEntry")(function* run(
        command: SourcePageCommand
      ) {
        const workTree = yield* toWorkTree(
          command.projectId,
          command.directionId
        ).pipe(Effect.provideService(ProjectStore, projects));

        if (!(yield* hasPage(workTree, command.file))) {
          return null;
        }

        return toEntryOf(yield* getRecord(workTree), command.file);
      });

      return RouteSourceStore.of({
        get: Effect.fn("RouteSourceStore.get")(function* run(
          command: SourcePageCommand
        ) {
          const workTree = yield* toWorkTree(
            command.projectId,
            command.directionId
          ).pipe(Effect.provideService(ProjectStore, projects));

          if (!(yield* hasPage(workTree, command.file))) {
            return yield* new NotFound({
              message: `The page ${command.file} does not exist.`,
            });
          }

          return toEntryOf(yield* getRecord(workTree), command.file);
        }),
        inspect: Effect.fn("RouteSourceStore.inspect")(function* run(
          command: SourcePageCommand
        ) {
          const entry = yield* toEntry(command);

          if (entry === null) {
            return NOT_A_COPY;
          }

          const app = yield* toAppWorkTree(entry.appProjectId).pipe(
            Effect.provideService(ProjectStore, projects)
          );

          const now = yield* toShaMap(
            app.workTree,
            entry.files.map((saved) => saved.file)
          );

          const changes = toChangedFiles(entry.files, now);

          return {
            appProjectId: entry.appProjectId,
            changedFiles: changes,
            copiedAt: entry.copiedAt,
            isChanged: changes.length > 0,
            isRouteCopy: true,
            routePath: entry.routePath,
          };
        }),
      });
    })
  );
}

export { RouteSourceStore };

export type { RouteSourceStoreApi };
