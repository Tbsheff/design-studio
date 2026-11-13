import { BadRequest } from "@design-studio/actions/_core/errors/bad-request";
import type { McpStatus } from "@design-studio/contracts/export";
import { Context, Effect, Layer } from "effect";

import { attemptKnown } from "../platform/attempt/index.js";
import { lifeRuntime } from "./mcp-life-runtime.js";
import type { McpLifeApprovals, McpLifeRuntime } from "./mcp-life-runtime.js";

interface McpSettingsUpdate {
  readonly edits?: boolean;
  readonly enabled?: boolean;
  readonly rotate?: boolean;
  readonly trustedFolders?: readonly string[];
}

interface McpSettingsWriterApi {
  readonly update: (
    input: McpSettingsUpdate
  ) => Effect.Effect<McpStatus, BadRequest>;
}

const setPendingDenied = (approvals: McpLifeApprovals): void => {
  for (const item of approvals.list()) {
    approvals.answer(item.id, false);
  }
};

const applyEdits = Effect.fn("McpSettingsWriter.applyEdits")(function* run(
  runtime: McpLifeRuntime,
  edits: boolean
) {
  yield* Effect.promise(() => runtime.mcp.setEdits(edits));

  if (!edits) {
    setPendingDenied(runtime.approvals);
  }
});

const applyEnabled = Effect.fn("McpSettingsWriter.applyEnabled")(function* run(
  runtime: McpLifeRuntime,
  enabled: boolean
) {
  if (!enabled) {
    setPendingDenied(runtime.approvals);
  }

  return yield* Effect.promise(() => runtime.mcp.setEnabled(enabled));
});

const applyTrustedFolders = Effect.fn("McpSettingsWriter.applyTrustedFolders")(
  function* run(runtime: McpLifeRuntime, raw: readonly string[]) {
    yield* Effect.mapError(
      attemptKnown(() => runtime.mcp.setTrustedFolders(raw)),
      (error) => new BadRequest({ message: error.message })
    );
  }
);

class McpSettingsWriter extends Context.Service<
  McpSettingsWriter,
  McpSettingsWriterApi
>()("design-studio/mcp-life/McpSettingsWriter") {
  declare public readonly access: "write";

  public static readonly layer = Layer.succeed(
    McpSettingsWriter,
    McpSettingsWriter.of({
      update: Effect.fn("McpSettingsWriter.update")(function* run(
        input: McpSettingsUpdate
      ) {
        const runtime = yield* lifeRuntime();
        const { edits = null, enabled = null, rotate = false } = input;
        const { trustedFolders = null } = input;

        if (trustedFolders !== null) {
          yield* applyTrustedFolders(runtime, trustedFolders);
        }

        if (rotate) {
          yield* Effect.promise(() => runtime.mcp.rotate());
        }

        if (edits !== null) {
          yield* applyEdits(runtime, edits);
        }

        if (enabled !== null) {
          const status = yield* applyEnabled(runtime, enabled);
          runtime.onSettingsChanged();

          return status;
        }

        runtime.onSettingsChanged();

        return yield* Effect.promise(() => runtime.mcp.status());
      }),
    })
  );
}

export { McpSettingsWriter };

export type { McpSettingsUpdate };
