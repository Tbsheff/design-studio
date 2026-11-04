import { Context, Effect, Layer } from "effect";

import { NotFound } from "@design-studio/actions/_core/errors/not-found";
import type { McpApprovalRecord } from "@design-studio/actions/_core/contracts";
import { lifeRuntime } from "./mcp-life-runtime.js";

interface ApprovalPoll {
  readonly edits: boolean;
  readonly pending: McpApprovalRecord[];
}

interface McpApprovalStoreApi {
  readonly peek: (id: string) => Effect.Effect<McpApprovalRecord, NotFound>;
  readonly poll: (
    seen: string,
    waitSeconds: number
  ) => Effect.Effect<ApprovalPoll>;
}

const WAIT_MAX_SECONDS = 25;

const MS_PER_SECOND = 1000;

const NOT_OPEN = "The approval request is not open.";

class McpApprovalStore extends Context.Service<
  McpApprovalStore,
  McpApprovalStoreApi
>()("design-studio/mcp-life/McpApprovalStore") {
  declare public readonly access: "read";

  public static readonly layer = Layer.succeed(
    McpApprovalStore,
    McpApprovalStore.of({
      peek: Effect.fn("McpApprovalStore.peek")(function* run(id: string) {
        const runtime = yield* lifeRuntime();

        const open =
          runtime.approvals.list().find((item) => item.id === id) ?? null;

        if (open === null) {
          return yield* new NotFound({ message: NOT_OPEN });
        }

        return open;
      }),
      poll: Effect.fn("McpApprovalStore.poll")(function* run(
        seen: string,
        waitSeconds: number
      ) {
        const runtime = yield* lifeRuntime();

        if (!(yield* Effect.promise(() => runtime.mcp.editsOn()))) {
          return { edits: false, pending: [] };
        }

        const wait = Math.min(WAIT_MAX_SECONDS, Math.max(0, waitSeconds));

        const pending = yield* Effect.promise((signal) =>
          runtime.approvals.poll(seen, wait * MS_PER_SECOND, signal)
        );

        return { edits: true, pending };
      }),
    })
  );
}

export { McpApprovalStore };

export type { ApprovalPoll };
