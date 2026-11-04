import { Context, Effect, Layer } from "effect";

import { NotFound } from "@design-studio/actions/_core/errors/not-found";
import { lifeRuntime } from "./mcp-life-runtime.js";

interface ApprovalWindowQueueApi {
  readonly answer: (
    id: string,
    allow: boolean
  ) => Effect.Effect<{ readonly ok: true }, NotFound>;
}

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
    })
  );
}

export { ApprovalWindowQueue };
