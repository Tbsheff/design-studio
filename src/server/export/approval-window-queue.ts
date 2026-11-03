import { Context, Effect, Layer } from "effect";

import type { BadRequest } from "../../shared/actions/_core/errors/bad-request.js";
import { NotFound } from "../../shared/actions/_core/errors/not-found.js";
import type { McpApprovalRecord } from "../../shared/contracts.js";
import type { McpStatus } from "../../shared/export.js";
import { lifeRuntime } from "./mcp-life-runtime.js";

interface McpSettingsUpdate {
  readonly edits?: boolean;
  readonly enabled?: boolean;
  readonly rotate?: boolean;
}

interface ApprovalPoll {
  readonly edits: boolean;
  readonly pending: McpApprovalRecord[];
}

interface ApprovalWindowQueueApi {
  readonly answer: (
    id: string,
    allow: boolean
  ) => Effect.Effect<{ readonly ok: true }, BadRequest | NotFound>;
  readonly peek: (
    id: string
  ) => Effect.Effect<McpApprovalRecord, BadRequest | NotFound>;
  readonly poll: (
    seen: string,
    waitSeconds: number
  ) => Effect.Effect<ApprovalPoll, BadRequest>;
  readonly update: (
    input: McpSettingsUpdate
  ) => Effect.Effect<McpStatus, BadRequest>;
}

const WAIT_MAX_SECONDS = 25;
const MS_PER_SECOND = 1000;

const NOT_OPEN = "The approval request is not open.";

class ApprovalWindowQueue extends Context.Service<
  ApprovalWindowQueue,
  ApprovalWindowQueueApi
>()("design-studio/mcp-life/ApprovalWindowQueue") {
  declare public readonly access: "write";

  public static readonly layer = Layer.succeed(
    ApprovalWindowQueue,
    ApprovalWindowQueue.of({
      answer: Effect.fn("ApprovalWindowQueue.answer")(function* run(
        id: string,
        allow: boolean
      ) {
        const runtime = yield* lifeRuntime();

        if (!runtime.approvals.answer(id, allow)) {
          return yield* new NotFound({ message: NOT_OPEN });
        }

        return { ok: true } as const;
      }),
      peek: Effect.fn("ApprovalWindowQueue.peek")(function* run(id: string) {
        const runtime = yield* lifeRuntime();
        const all = runtime.approvals.list();

        const open = all.find((item) => item.id === id) ?? null;

        if (open === null) {
          return yield* new NotFound({ message: NOT_OPEN });
        }

        return open;
      }),
      poll: Effect.fn("ApprovalWindowQueue.poll")(function* run(
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
      update: Effect.fn("ApprovalWindowQueue.update")(function* run(
        input: McpSettingsUpdate
      ) {
        const runtime = yield* lifeRuntime();
        const { approvals, mcp } = runtime;

        const denyPending = (): void => {
          for (const item of approvals.list()) {
            approvals.answer(item.id, false);
          }
        };

        if (input.rotate === true) {
          yield* Effect.promise(() => mcp.rotate());
        }

        const { edits = null, enabled = null } = input;

        if (edits !== null) {
          yield* Effect.promise(() => mcp.setEdits(edits));

          if (!edits) {
            denyPending();
          }
        }

        if (enabled !== null) {
          if (!enabled) {
            denyPending();
          }

          const status = yield* Effect.promise(() => mcp.setEnabled(enabled));
          runtime.onSettingsChanged();

          return status;
        }

        runtime.onSettingsChanged();

        return yield* Effect.promise(() => mcp.status());
      }),
    })
  );
}

export { ApprovalWindowQueue };

export type { ApprovalPoll, McpSettingsUpdate };
