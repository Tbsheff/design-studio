import { Context, Effect, Layer } from "effect";

import type {
  DoctorViewText,
  PortPlanView,
} from "../../shared/actions/mcp-read/schema.js";
import type { ComponentUsage } from "../../shared/usage-scope.js";
import { readDoctor, toDoctorText } from "./doctor-read.js";
import { attemptMcpRead } from "./mcp-read-core.js";
import type { McpReadError, PortPlanQuery } from "./mcp-read-core.js";
import { readUsage } from "./usage-read.js";
import type { UsageQuery } from "./usage-read.js";

interface McpReadStoreApi {
  readonly doctor: (
    projectId: string,
    isFresh: boolean
  ) => Effect.Effect<DoctorViewText, McpReadError>;
  readonly portPlan: (
    query: PortPlanQuery
  ) => Effect.Effect<PortPlanView, McpReadError>;
  readonly usage: (
    query: UsageQuery
  ) => Effect.Effect<ComponentUsage, McpReadError>;
}

class McpReadStore extends Context.Service<McpReadStore, McpReadStoreApi>()(
  "design-studio/preview/McpReadStore"
) {
  declare public readonly access: "read";

  public static readonly layer = Layer.succeed(
    McpReadStore,
    McpReadStore.of({
      doctor: Effect.fn("McpReadStore.doctor")(function* run(
        projectId: string,
        isFresh: boolean
      ) {
        return yield* attemptMcpRead(async (runtime) =>
          toDoctorText(
            await readDoctor(
              runtime.projects,
              runtime.preview,
              projectId,
              isFresh
            )
          )
        );
      }),
      portPlan: Effect.fn("McpReadStore.portPlan")(function* run(
        query: PortPlanQuery
      ) {
        return yield* attemptMcpRead((runtime) => runtime.planPort(query));
      }),
      usage: Effect.fn("McpReadStore.usage")(function* run(query: UsageQuery) {
        return yield* attemptMcpRead((runtime) =>
          readUsage(runtime.projects, runtime.preview, query)
        );
      }),
    })
  );
}

export { McpReadStore };

export type { McpReadStoreApi };
