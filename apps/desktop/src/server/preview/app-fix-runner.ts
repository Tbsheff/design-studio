import type {
  AppFixResult,
  DoctorCauseKind,
} from "@design-studio/contracts/app-doctor";
import { Context, Effect, Layer } from "effect";

import { applyAppFix } from "./app-fix.js";
import { attemptMcpRead } from "./mcp-read-core.js";
import type { McpReadError } from "./mcp-read-core.js";

interface AppFixRunnerApi {
  readonly apply: (
    projectId: string,
    kind: DoctorCauseKind
  ) => Effect.Effect<AppFixResult, McpReadError>;
}

class AppFixRunner extends Context.Service<AppFixRunner, AppFixRunnerApi>()(
  "design-studio/preview/AppFixRunner"
) {
  declare public readonly access: "write";

  public static readonly layer = Layer.succeed(
    AppFixRunner,
    AppFixRunner.of({
      apply: Effect.fn("AppFixRunner.apply")(function* run(
        projectId: string,
        kind: DoctorCauseKind
      ) {
        return yield* attemptMcpRead((runtime) =>
          applyAppFix(runtime, projectId, kind)
        );
      }),
    })
  );
}

export { AppFixRunner };
