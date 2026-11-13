import { Context, Effect, Layer } from "effect";

import type { KnownFailure } from "../../platform/attempt/index.js";
import { ProjectStore } from "../../store/index.js";
import type { LocalOrgScope } from "../../store/index.js";
import { toFileHashes, toPagePath, toRouteFiles } from "./route-source-file.js";
import type { RouteSourceEntry } from "./route-source-file.js";
import { setRecordEntry } from "./route-source-record.js";
import { toAppWorkTree, toWorkTree } from "./route-source-target.js";

interface RecordCommand {
  readonly appProjectId: string;
  readonly directionId: string;
  readonly frameId: string;
  readonly page: string;
  readonly projectId: string;
  readonly routePath: string;
  readonly viewport: number | null;
}

interface RouteSourceWriterApi {
  readonly record: (
    command: RecordCommand
  ) => Effect.Effect<RouteSourceEntry, KnownFailure, LocalOrgScope>;
}

class RouteSourceWriter extends Context.Service<
  RouteSourceWriter,
  RouteSourceWriterApi
>()("design-studio/project-ops/RouteSourceWriter") {
  declare public readonly access: "write";

  public static readonly layer = Layer.effect(
    RouteSourceWriter,
    Effect.gen(function* build() {
      const projects = yield* ProjectStore;

      return RouteSourceWriter.of({
        record: Effect.fn("RouteSourceWriter.record")(function* run(
          command: RecordCommand
        ) {
          const workTree = yield* toWorkTree(
            command.projectId,
            command.directionId
          ).pipe(Effect.provideService(ProjectStore, projects));

          const app = yield* toAppWorkTree(command.appProjectId).pipe(
            Effect.provideService(ProjectStore, projects)
          );

          const files = yield* toRouteFiles(
            app.workTree,
            app.appDir,
            command.routePath
          );

          const entry: RouteSourceEntry = {
            appProjectId: command.appProjectId,
            copiedAt: Date.now(),
            files: yield* toFileHashes(app.workTree, files),
            frameId: command.frameId,
            page: toPagePath(command.page),
            routePath: command.routePath,
            viewport: command.viewport,
          };

          yield* setRecordEntry(workTree, entry);

          return entry;
        }),
      });
    })
  );
}

export { RouteSourceWriter };

export type { RecordCommand, RouteSourceWriterApi };
