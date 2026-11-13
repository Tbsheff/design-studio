import { BadRequest } from "@design-studio/actions/_core/errors/bad-request";
import { NotFound } from "@design-studio/actions/_core/errors/not-found";
import { Context, Effect, Layer } from "effect";

import type { KnownFailure } from "../../platform/attempt/index.js";
import { ProjectStore } from "../../store/index.js";
import type { LocalOrgScope } from "../../store/index.js";
import { getRecord, hasPage, toEntryOf } from "./route-source-file.js";
import type { RouteSourceEntry } from "./route-source-file.js";
import { setCopyEntry } from "./route-source-record.js";
import { toWorkTree } from "./route-source-target.js";
import type { SourcePageCommand } from "./route-source-target.js";

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
  readonly set: (
    command: SourcePageCommand
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

          return yield* setCopyEntry(workTree, command).pipe(
            Effect.provideService(ProjectStore, projects)
          );
        }),
        set: Effect.fn("RouteSourceWriter.set")(function* run(
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

          const saved = toEntryOf(yield* getRecord(workTree), command.file);

          if (saved === null) {
            return yield* new BadRequest({
              message: `The page ${command.file} is not a copy of an app route. Only a route prototype page can be marked as current.`,
            });
          }

          return yield* setCopyEntry(workTree, saved).pipe(
            Effect.provideService(ProjectStore, projects)
          );
        }),
      });
    })
  );
}

export { RouteSourceWriter };

export type { RecordCommand, RouteSourceWriterApi };
