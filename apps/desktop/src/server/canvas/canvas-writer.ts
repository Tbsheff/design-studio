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
import { deleteCanvasFrames } from "./frame-delete/index.js";
import type { FramesDeleteQuery, FramesRemoved } from "./frame-delete/index.js";
import {
  createCanvasFrame,
  createCanvasRouteFrame,
  deleteCanvasFrame,
  setCanvasPoint,
  updateCanvasFrames,
} from "./frame-ops.js";
import type {
  FrameAddQuery,
  FrameDeleteQuery,
  FramePlaceQuery,
  FramePointQuery,
  FramePointed,
  FrameRemoved,
  FrameRouteQuery,
} from "./frame-ops.js";
import { setCanvasGuides } from "./guide-ops.js";
import type { GuidesSet, GuidesSetQuery } from "./guide-ops.js";
import { setCanvasLayoutGrid } from "./layout-grid-ops.js";
import type { LayoutGridQuery, LayoutGridSet } from "./layout-grid-ops.js";
import { deleteCanvasSection, setCanvasSection } from "./section-ops.js";
import type {
  SectionDeleteQuery,
  SectionRemoved,
  SectionSet,
  SectionSetQuery,
} from "./section-ops.js";
import { createStateBoard } from "./state-frames/index.js";
import type {
  StateFramesCreated,
  StateFramesQuery,
} from "./state-frames/index.js";
import type { PlaceOutcome } from "./tools.js";

interface CanvasWriterApi {
  readonly createFrame: (
    query: FrameAddQuery
  ) => Effect.Effect<PlaceOutcome, CanvasFailure>;
  readonly createFlow: (
    query: FlowQuery
  ) => Effect.Effect<FlowResult, CanvasFailure>;
  readonly createRouteFrame: (
    query: FrameRouteQuery
  ) => Effect.Effect<PlaceOutcome, CanvasFailure>;
  readonly createStateFrames: (
    query: StateFramesQuery
  ) => Effect.Effect<StateFramesCreated, CanvasFailure>;
  readonly deleteFrame: (
    query: FrameDeleteQuery
  ) => Effect.Effect<FrameRemoved, CanvasFailure>;
  readonly deleteFrames: (
    query: FramesDeleteQuery
  ) => Effect.Effect<FramesRemoved, CanvasFailure>;
  readonly deleteSection: (
    query: SectionDeleteQuery
  ) => Effect.Effect<SectionRemoved, CanvasFailure>;
  readonly setDoc: (
    query: CanvasDocWriteQuery
  ) => Effect.Effect<CanvasDocRead, CanvasFailure>;
  readonly setFrameState: (
    query: FrameStateQuery
  ) => Effect.Effect<FrameStateSet, CanvasFailure>;
  readonly setGuides: (
    query: GuidesSetQuery
  ) => Effect.Effect<GuidesSet, CanvasFailure>;
  readonly setLayoutGrid: (
    query: LayoutGridQuery
  ) => Effect.Effect<LayoutGridSet, CanvasFailure>;
  readonly setSection: (
    query: SectionSetQuery
  ) => Effect.Effect<SectionSet, CanvasFailure>;
  readonly setPoint: (
    query: FramePointQuery
  ) => Effect.Effect<FramePointed, CanvasFailure>;
  readonly setPresence: (
    query: PresenceQuery
  ) => Effect.Effect<Record<string, never>, CanvasFailure>;
  readonly updateFrames: (
    query: FramePlaceQuery
  ) => Effect.Effect<PlaceOutcome, CanvasFailure>;
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
      createFrame: Effect.fn("CanvasWriter.createFrame")(function* run(
        query: FrameAddQuery
      ) {
        return yield* attemptCanvas((runtime) =>
          createCanvasFrame(runtime, query)
        );
      }),
      createRouteFrame: Effect.fn("CanvasWriter.createRouteFrame")(
        function* run(query: FrameRouteQuery) {
          return yield* attemptCanvas((runtime) =>
            createCanvasRouteFrame(runtime, query)
          );
        }
      ),
      createStateFrames: Effect.fn("CanvasWriter.createStateFrames")(
        function* run(query: StateFramesQuery) {
          return yield* attemptCanvas((runtime) =>
            createStateBoard(runtime, query)
          );
        }
      ),
      deleteFrame: Effect.fn("CanvasWriter.deleteFrame")(function* run(
        query: FrameDeleteQuery
      ) {
        return yield* attemptCanvas((runtime) =>
          deleteCanvasFrame(runtime, query)
        );
      }),
      deleteFrames: Effect.fn("CanvasWriter.deleteFrames")(function* run(
        query: FramesDeleteQuery
      ) {
        return yield* attemptCanvas((runtime) =>
          deleteCanvasFrames(runtime, query)
        );
      }),
      deleteSection: Effect.fn("CanvasWriter.deleteSection")(function* run(
        query: SectionDeleteQuery
      ) {
        return yield* attemptCanvas((runtime) =>
          deleteCanvasSection(runtime, query)
        );
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
      setGuides: Effect.fn("CanvasWriter.setGuides")(function* run(
        query: GuidesSetQuery
      ) {
        return yield* attemptCanvas((runtime) =>
          setCanvasGuides(runtime, query)
        );
      }),
      setLayoutGrid: Effect.fn("CanvasWriter.setLayoutGrid")(function* run(
        query: LayoutGridQuery
      ) {
        return yield* attemptCanvas((runtime) =>
          setCanvasLayoutGrid(runtime, query)
        );
      }),
      setPoint: Effect.fn("CanvasWriter.setPoint")(function* run(
        query: FramePointQuery
      ) {
        return yield* attemptCanvas((runtime) =>
          setCanvasPoint(runtime, query)
        );
      }),
      setPresence: Effect.fn("CanvasWriter.setPresence")(function* run(
        query: PresenceQuery
      ) {
        return yield* attemptCanvas((runtime) => writePresence(runtime, query));
      }),
      setSection: Effect.fn("CanvasWriter.setSection")(function* run(
        query: SectionSetQuery
      ) {
        return yield* attemptCanvas((runtime) =>
          setCanvasSection(runtime, query)
        );
      }),
      updateFrameSession: Effect.fn("CanvasWriter.updateFrameSession")(
        function* run(query: FrameSessionQuery) {
          return yield* attemptCanvas((runtime) =>
            writeSession(runtime, query)
          );
        }
      ),
      updateFrames: Effect.fn("CanvasWriter.updateFrames")(function* run(
        query: FramePlaceQuery
      ) {
        return yield* attemptCanvas((runtime) =>
          updateCanvasFrames(runtime, query)
        );
      }),
    })
  );
}

export { CanvasWriter };

export type { CanvasWriterApi };
