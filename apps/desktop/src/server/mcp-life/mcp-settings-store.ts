import type { McpSetup } from "@design-studio/actions/connection/schema";
import type { McpStatus } from "@design-studio/contracts/export";
import { Context, Effect, Layer } from "effect";

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
  readonly setup: () => Effect.Effect<McpSetup>;
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
      setup: Effect.fn("McpSettingsStore.setup")(function* run() {
        const runtime = yield* lifeRuntime();

        return yield* Effect.promise(() => runtime.mcp.setup());
      }),
      status: Effect.fn("McpSettingsStore.status")(function* run() {
        const runtime = yield* lifeRuntime();
        const status = yield* Effect.promise(() => runtime.mcp.status());

        return toRedactedStatus(status);
      }),
    })
  );
}

export { McpSettingsStore };
