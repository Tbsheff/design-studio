import { BadRequest } from "@design-studio/actions/_core/errors/bad-request";
import { NotFound } from "@design-studio/actions/_core/errors/not-found";
import { Context, Effect, Layer } from "effect";

import type { KnownFailure } from "../../platform/attempt/index.js";
import { lastReview } from "../../review/index.js";
import { RunLogStore } from "../../run-log/index.js";
import { ProjectStore } from "../../store/index.js";
import type { LocalOrgScope } from "../../store/index.js";
import { toSuggestionContext } from "./suggestion-context.js";
import type { RunCommand, SuggestionResult } from "./suggestion-model.js";
import { runSuggestionModel } from "./suggestion-run.js";

interface SuggestionRunnerApi {
  readonly run: (
    command: RunCommand
  ) => Effect.Effect<
    SuggestionResult,
    BadRequest | KnownFailure | NotFound,
    LocalOrgScope
  >;
}

class SuggestionRunner extends Context.Service<
  SuggestionRunner,
  SuggestionRunnerApi
>()("design-studio/project-ops/SuggestionRunner") {
  declare public readonly access: "write";

  public static readonly layer = Layer.effect(
    SuggestionRunner,
    Effect.gen(function* build() {
      const projects = yield* ProjectStore;
      const runs = yield* RunLogStore;

      return SuggestionRunner.of({
        run: Effect.fn("SuggestionRunner.run")(function* run(
          command: RunCommand
        ) {
          const detail = yield* runs.get(command.projectId, command.runId);
          const { summary } = detail;

          if (summary === null || summary.directionId !== command.directionId) {
            return yield* new NotFound({
              message: `Run ${command.runId} is not in this direction.`,
            });
          }

          if (summary.finishedAt === null) {
            return yield* new BadRequest({
              message: "The run is not finished yet.",
            });
          }

          const designMd = yield* projects.readDesignMd(command.projectId);

          const findings =
            lastReview(command.projectId, command.directionId)?.findings ?? [];

          const context = toSuggestionContext(summary, designMd, findings);

          return yield* runSuggestionModel(context);
        }),
      });
    })
  );
}

export { SuggestionRunner };

export type { SuggestionRunnerApi };
