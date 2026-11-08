import { Context, Effect, Layer } from "effect";

import type { KnownFailure } from "../../platform/attempt/index.js";
import { ProjectStore } from "../../store/index.js";
import type { LocalOrgScope } from "../../store/index.js";
import { toBriefContext } from "./brief-context.js";
import type { BriefContext, BriefResult, RunCommand } from "./brief-model.js";
import { runBriefModel } from "./brief-run.js";

interface BriefRunnerApi {
  readonly run: (
    command: RunCommand
  ) => Effect.Effect<BriefResult, KnownFailure, LocalOrgScope>;
}

const NO_CONTEXT: BriefContext = { designMd: null, kit: [], routes: [] };

class BriefRunner extends Context.Service<BriefRunner, BriefRunnerApi>()(
  "design-studio/project-ops/BriefRunner"
) {
  declare public readonly access: "write";

  public static readonly layer = Layer.effect(
    BriefRunner,
    Effect.gen(function* build() {
      const projects = yield* ProjectStore;

      return BriefRunner.of({
        run: Effect.fn("BriefRunner.run")(function* run(command: RunCommand) {
          if (command.projectId === null) {
            return yield* runBriefModel(command.prompt, NO_CONTEXT);
          }

          const project = yield* projects.get(command.projectId);
          const designMd = yield* projects.readDesignMd(command.projectId);
          const context = yield* toBriefContext(project, designMd);

          return yield* runBriefModel(command.prompt, context);
        }),
      });
    })
  );
}

export { BriefRunner };

export type { BriefRunnerApi };
