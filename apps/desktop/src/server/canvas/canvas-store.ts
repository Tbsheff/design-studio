import type { ApprovalCard } from "@design-studio/actions/_core/approval-card";
import type { FrameStatesView } from "@design-studio/contracts/frame-state";
import { Context, Effect, Layer } from "effect";

import type { RouteLinksResult } from "../../shared/route-flow.js";
import {
  readDoc,
  readFlowLinks,
  readFlowParamList,
  readStates,
} from "./canvas-ops.js";
import type { CanvasDocRead } from "./canvas-ops.js";
import { attemptCanvas } from "./canvas-runtime.js";
import type { CanvasFailure } from "./canvas-runtime.js";
import { getCanvasDeleteCard, inspectCanvasFrames } from "./frame-ops.js";
import type { FrameDeleteQuery, FrameTarget } from "./frame-ops.js";
import type { CanvasListing } from "./tools.js";

interface CanvasStoreApi {
  readonly deleteCard: (
    query: FrameDeleteQuery
  ) => Effect.Effect<ApprovalCard, CanvasFailure>;
  readonly flowLinks: (
    projectId: string,
    route: string
  ) => Effect.Effect<RouteLinksResult, CanvasFailure>;
  readonly flowParams: (
    projectId: string
  ) => Effect.Effect<{ params: Record<string, string> }, CanvasFailure>;
  readonly frameStates: (
    projectId: string
  ) => Effect.Effect<FrameStatesView, CanvasFailure>;
  readonly getDoc: (
    projectId: string
  ) => Effect.Effect<CanvasDocRead, CanvasFailure>;
  readonly inspectFrames: (
    target: FrameTarget
  ) => Effect.Effect<CanvasListing, CanvasFailure>;
}

class CanvasStore extends Context.Service<CanvasStore, CanvasStoreApi>()(
  "design-studio/canvas/CanvasStore"
) {
  declare public readonly access: "read";

  public static readonly layer = Layer.succeed(
    CanvasStore,
    CanvasStore.of({
      deleteCard: Effect.fn("CanvasStore.deleteCard")(function* run(
        query: FrameDeleteQuery
      ) {
        return yield* attemptCanvas((runtime) =>
          getCanvasDeleteCard(runtime, query)
        );
      }),
      flowLinks: Effect.fn("CanvasStore.flowLinks")(function* run(
        projectId: string,
        route: string
      ) {
        return yield* attemptCanvas((runtime) =>
          readFlowLinks(runtime, projectId, route)
        );
      }),
      flowParams: Effect.fn("CanvasStore.flowParams")(function* run(
        projectId: string
      ) {
        return yield* attemptCanvas((runtime) =>
          readFlowParamList(runtime, projectId)
        );
      }),
      frameStates: Effect.fn("CanvasStore.frameStates")(function* run(
        projectId: string
      ) {
        return yield* attemptCanvas((runtime) =>
          readStates(runtime, projectId)
        );
      }),
      getDoc: Effect.fn("CanvasStore.getDoc")(function* run(projectId: string) {
        return yield* attemptCanvas((runtime) => readDoc(runtime, projectId));
      }),
      inspectFrames: Effect.fn("CanvasStore.inspectFrames")(function* run(
        target: FrameTarget
      ) {
        return yield* attemptCanvas((runtime) =>
          inspectCanvasFrames(runtime, target)
        );
      }),
    })
  );
}

export { CanvasStore };

export type { CanvasStoreApi };
