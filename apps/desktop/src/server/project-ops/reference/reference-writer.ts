import type { BadRequest } from "@design-studio/actions/_core/errors/bad-request";
import type { Conflict } from "@design-studio/actions/_core/errors/conflict";
import { NotFound } from "@design-studio/actions/_core/errors/not-found";
import { Context, Effect, Layer } from "effect";

import { attemptKnown } from "../../platform/attempt/index.js";
import { ProjectStore, importReferenceInto } from "../../store/index.js";
import type { LocalOrgScope, ReferenceSummary } from "../../store/index.js";

interface ImportReferenceCommand {
  readonly data: string | null;
  readonly fileName: string | null;
  readonly name: string | null;
  readonly path: string | null;
  readonly projectId: string;
}

type WriteFailure = BadRequest | Conflict | NotFound;

interface ReferenceWriterApi {
  readonly import: (
    command: ImportReferenceCommand
  ) => Effect.Effect<ReferenceSummary, WriteFailure, LocalOrgScope>;
}

const MAIN_DIRECTION_ID = "main";

class ReferenceWriter extends Context.Service<
  ReferenceWriter,
  ReferenceWriterApi
>()("design-studio/project-ops/ReferenceWriter") {
  declare public readonly access: "write";

  public static readonly layer = Layer.effect(
    ReferenceWriter,
    Effect.gen(function* build() {
      const projects = yield* ProjectStore;

      return ReferenceWriter.of({
        import: Effect.fn("ReferenceWriter.import")(function* run(
          command: ImportReferenceCommand
        ) {
          const project = yield* projects.get(command.projectId);

          const direction =
            project.directions.find(
              (candidate) => candidate.id === MAIN_DIRECTION_ID
            ) ?? project.directions[0];

          if (!direction) {
            return yield* new NotFound({
              message: "The project has no design.",
            });
          }

          return yield* attemptKnown(() =>
            importReferenceInto({
              data: command.data,
              fileName: command.fileName,
              name: command.name,
              path: command.path,
              workTree: direction.workTree,
            })
          );
        }),
      });
    })
  );
}

export { ReferenceWriter };

export type { ImportReferenceCommand, ReferenceWriterApi };
