import { Context, Effect, Layer } from "effect";

import type { McpStatus } from "@design-studio/actions/_core/export";
import { lifeRuntime } from "./mcp-life-runtime.js";

const toRedactedStatus = (status: McpStatus): McpStatus => {
  if (status.command === null) {
    return status;
  }

  return {
    ...status,
    command: status.command.replace(/Bearer [^"\s]+/u, "Bearer <token>"),
  };
};

interface McpSettingsStoreApi {
  readonly status: () => Effect.Effect<McpStatus>;
}

class McpSettingsStore extends Context.Service<
  McpSettingsStore,
  McpSettingsStoreApi
>()("design-studio/mcp-life/McpSettingsStore") {
  declare public readonly access: "read";

  public static readonly layer = Layer.succeed(
    McpSettingsStore,
    McpSettingsStore.of({
      status: Effect.fn("McpSettingsStore.status")(function* run() {
        const runtime = yield* lifeRuntime();
        const status = yield* Effect.promise(() => runtime.mcp.status());

        return toRedactedStatus(status);
      }),
    })
  );
}

export { McpSettingsStore };
