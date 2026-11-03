import { Context, Effect, Layer } from "effect";

import type { Input } from "../../shared/actions/_core/action.js";
import type { createProject } from "../../shared/actions/project/create.js";
import type { importProject } from "../../shared/actions/project/import.js";
import type { updateProject } from "../../shared/actions/project/update.js";
import type { KnownFailure } from "../platform/attempt/index.js";
import { createProjectIn, importProjectIn } from "./project-ops-create.js";
import {
  deleteCommandRuleIn,
  setDesignMdIn,
  updateSettingsIn,
} from "./project-ops-detail.js";
import { moveHiddenIn } from "./project-ops-hidden.js";
import { attemptProjectOps } from "./project-ops-runtime.js";

type CreateInput = Input<typeof createProject>;

type ImportInput = Input<typeof importProject>;

type SettingsFields = Omit<Input<typeof updateProject>, "projectId">;

interface ProjectOpsWriterApi {
  readonly create: (
    input: CreateInput
  ) => Effect.Effect<Awaited<ReturnType<typeof createProjectIn>>, KnownFailure>;
  readonly deleteCommandRule: (
    projectId: string,
    rule: string
  ) => Effect.Effect<
    Awaited<ReturnType<typeof deleteCommandRuleIn>>,
    KnownFailure
  >;
  readonly importFolder: (
    input: ImportInput
  ) => Effect.Effect<Awaited<ReturnType<typeof importProjectIn>>, KnownFailure>;
  readonly moveHidden: () => Effect.Effect<
    Awaited<ReturnType<typeof moveHiddenIn>>,
    KnownFailure
  >;
  readonly setDesignMd: (
    projectId: string,
    content: string
  ) => Effect.Effect<Awaited<ReturnType<typeof setDesignMdIn>>, KnownFailure>;
  readonly updateSettings: (
    projectId: string,
    fields: SettingsFields
  ) => Effect.Effect<
    Awaited<ReturnType<typeof updateSettingsIn>>,
    KnownFailure
  >;
}

class ProjectOpsWriter extends Context.Service<
  ProjectOpsWriter,
  ProjectOpsWriterApi
>()("design-studio/project-ops/ProjectOpsWriter") {
  declare public readonly access: "write";

  public static readonly layer = Layer.succeed(
    ProjectOpsWriter,
    ProjectOpsWriter.of({
      create: Effect.fn("ProjectOpsWriter.create")(function* run(
        input: CreateInput
      ) {
        return yield* attemptProjectOps((runtime) =>
          createProjectIn(runtime, input)
        );
      }),
      deleteCommandRule: Effect.fn("ProjectOpsWriter.deleteCommandRule")(
        function* run(projectId: string, rule: string) {
          return yield* attemptProjectOps((runtime) =>
            deleteCommandRuleIn(runtime, projectId, rule)
          );
        }
      ),
      importFolder: Effect.fn("ProjectOpsWriter.importFolder")(function* run(
        input: ImportInput
      ) {
        return yield* attemptProjectOps((runtime) =>
          importProjectIn(runtime, input)
        );
      }),
      moveHidden: Effect.fn("ProjectOpsWriter.moveHidden")(function* run() {
        return yield* attemptProjectOps((runtime) => moveHiddenIn(runtime));
      }),
      setDesignMd: Effect.fn("ProjectOpsWriter.setDesignMd")(function* run(
        projectId: string,
        content: string
      ) {
        return yield* attemptProjectOps((runtime) =>
          setDesignMdIn(runtime, projectId, content)
        );
      }),
      updateSettings: Effect.fn("ProjectOpsWriter.updateSettings")(
        function* run(projectId: string, fields: SettingsFields) {
          return yield* attemptProjectOps((runtime) =>
            updateSettingsIn(runtime, projectId, fields)
          );
        }
      ),
    })
  );
}

export { ProjectOpsWriter };

export type { ProjectOpsWriterApi };
