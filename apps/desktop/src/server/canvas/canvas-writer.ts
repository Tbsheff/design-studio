import type { FrameStatesView } from "@design-studio/contracts/frame-state";
import { Context, Effect, Layer } from "effect";

import type { FlowResult } from "../../shared/route-flow.js";
import {
  writeDoc,
  writeFlow,
  writePresence,
  writeSession,
  writeState,
} from "./canvas-ops.js";
import type {
  CanvasDocRead,
  CanvasDocWriteQuery,
  FlowQuery,
  FrameSessionQuery,
  FrameStateQuery,
  FrameStateSet,
  PresenceQuery,
} from "./canvas-ops.js";
import { attemptCanvas } from "./canvas-runtime.js";
import type { CanvasFailure } from "./canvas-runtime.js";

interface CanvasWriterApi {
  readonly createFlow: (
    query: FlowQuery
  ) => Effect.Effect<FlowResult, CanvasFailure>;
  readonly setDoc: (
    query: CanvasDocWriteQuery
  ) => Effect.Effect<CanvasDocRead, CanvasFailure>;
  readonly setFrameState: (
    query: FrameStateQuery
  ) => Effect.Effect<FrameStateSet, CanvasFailure>;
  readonly setPresence: (
    query: PresenceQuery
  ) => Effect.Effect<Record<string, never>, CanvasFailure>;
  readonly updateFrameSession: (
    query: FrameSessionQuery
  ) => Effect.Effect<FrameStatesView, CanvasFailure>;
}

class CanvasWriter extends Context.Service<CanvasWriter, CanvasWriterApi>()(
  "design-studio/canvas/CanvasWriter"
) {
  declare public readonly access: "write";

  public static readonly layer = Layer.succeed(
    CanvasWriter,
    CanvasWriter.of({
      createFlow: Effect.fn("CanvasWriter.createFlow")(function* run(
        query: FlowQuery
      ) {
        return yield* attemptCanvas((runtime) => writeFlow(runtime, query));
      }),
      setDoc: Effect.fn("CanvasWriter.setDoc")(function* run(
        query: CanvasDocWriteQuery
      ) {
        return yield* attemptCanvas((runtime) => writeDoc(runtime, query));
      }),
      setFrameState: Effect.fn("CanvasWriter.setFrameState")(function* run(
        query: FrameStateQuery
      ) {
        return yield* attemptCanvas((runtime) => writeState(runtime, query));
      }),
      setPresence: Effect.fn("CanvasWriter.setPresence")(function* run(
        query: PresenceQuery
      ) {
        return yield* attemptCanvas((runtime) => writePresence(runtime, query));
      }),
      updateFrameSession: Effect.fn("CanvasWriter.updateFrameSession")(
        function* run(query: FrameSessionQuery) {
          return yield* attemptCanvas((runtime) =>
            writeSession(runtime, query)
          );
        }
      ),
    })
  );
}

export { CanvasWriter };

export type { CanvasWriterApi };
