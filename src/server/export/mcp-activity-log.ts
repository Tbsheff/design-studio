import { Context, Effect, Layer } from "effect";

import { BadRequest } from "../../shared/actions/_core/errors/bad-request.js";
import { NotFound } from "../../shared/actions/_core/errors/not-found.js";
import type { McpActivity } from "../../shared/contracts.js";
import { NotFoundError } from "../store/errors.js";
import { lifeRuntime } from "./mcp-life-runtime.js";

interface McpActivityLogApi {
  readonly list: (
    projectId: string
  ) => Effect.Effect<readonly McpActivity[], BadRequest | NotFound>;
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

        const activity = yield* Effect.tryPromise(() =>
          runtime.activity.list(projectId)
        ).pipe(
          Effect.mapError((failure) => {
            if (failure.cause instanceof NotFoundError) {
              return new NotFound({ message: failure.cause.message });
            }

            return new BadRequest({ message: String(failure.cause) });
          })
        );

        return activity;
      }),
    })
  );
}

export { McpActivityLog };
