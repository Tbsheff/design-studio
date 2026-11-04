import type { NotFound } from "@design-studio/actions/_core/errors/not-found";
import type { McpActivity } from "@design-studio/contracts";
import { Context, Effect, Layer } from "effect";

import { attemptKnown } from "../platform/attempt/index.js";
import type { KnownFailure } from "../platform/attempt/index.js";
import { lifeRuntime } from "./mcp-life-runtime.js";

interface McpActivityList {
  readonly activity: readonly McpActivity[];
}

interface McpActivityLogApi {
  readonly list: (
    projectId: string
  ) => Effect.Effect<McpActivityList, KnownFailure | NotFound>;
}

class McpActivityLog extends Context.Service<
  McpActivityLog,
  McpActivityLogApi
>()("design-studio/mcp-life/McpActivityLog") {
  declare public readonly access: "read";

  public static readonly layer = Layer.succeed(
    McpActivityLog,
    McpActivityLog.of({
      list: Effect.fn("McpActivityLog.list")(function* run(projectId: string) {
        const runtime = yield* lifeRuntime();

        const activity = yield* attemptKnown(() =>
          runtime.activity.list(projectId)
        );

        return { activity };
      }),
    })
  );
}

export { McpActivityLog };

export type { McpActivityList };
