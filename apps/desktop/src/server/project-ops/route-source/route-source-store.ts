import { NotFound } from "@design-studio/actions/_core/errors/not-found";
import type {
  PageSource,
  PageSourceChanges,
} from "@design-studio/actions/page/source/schema";
import { Context, Effect, Layer } from "effect";

import type { KnownFailure } from "../../platform/attempt/index.js";
import { ProjectStore } from "../../store/index.js";
import type { LocalOrgScope } from "../../store/index.js";
import { toChangedFiles } from "./engine/to-changed-files.js";
import { toPageSourceChanges } from "./route-source-change.js";
import {
  getRecord,
  hasPage,
  toEntryOf,
  toShaMap,
} from "./route-source-file.js";
import type { RouteSourceEntry } from "./route-source-file.js";
import { toAppWorkTree, toCopyOf, toWorkTree } from "./route-source-target.js";
import type { SourcePageCommand } from "./route-source-target.js";

interface RouteSourceStoreApi {
  readonly get: (
    command: SourcePageCommand
  ) => Effect.Effect<RouteSourceEntry | null, KnownFailure, LocalOrgScope>;
  readonly inspect: (
    command: SourcePageCommand
  ) => Effect.Effect<PageSource, KnownFailure, LocalOrgScope>;
  readonly inspectChanges: (
    command: SourcePageCommand
  ) => Effect.Effect<PageSourceChanges, KnownFailure, LocalOrgScope>;
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
          const copy = yield* toCopyOf(command).pipe(
            Effect.provideService(ProjectStore, projects)
          );

          if (copy === null) {
            return NOT_A_COPY;
          }

          const { entry } = copy;

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
        inspectChanges: Effect.fn("RouteSourceStore.inspectChanges")(
          function* run(command: SourcePageCommand) {
            return yield* toPageSourceChanges(command).pipe(
              Effect.provideService(ProjectStore, projects)
            );
          }
        ),
      });
    })
  );
}

export { RouteSourceStore };

export type { RouteSourceStoreApi };
