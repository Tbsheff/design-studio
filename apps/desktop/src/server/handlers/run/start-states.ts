import type { Input } from "@design-studio/actions/_core/action";
import { BadRequest } from "@design-studio/actions/_core/errors/bad-request";
import { Conflict } from "@design-studio/actions/_core/errors/conflict";
import { NotFound } from "@design-studio/actions/_core/errors/not-found";
import { STATE_CHECK_THRESHOLD } from "@design-studio/actions/canvas/state-frames/schema";
import type { startStatesRun } from "@design-studio/actions/run/start-states";
import type { StateRunItem } from "@design-studio/actions/run/states/schema";
import type { RunCanvasRef } from "@design-studio/contracts";
import type { CanvasFileFrame } from "@design-studio/contracts/canvas-file";
import { Effect } from "effect";

import {
  CanvasStore,
  StateCheckStore,
  toStateLikeness,
} from "../../canvas/index.js";
import { EventQueue } from "../../events/index.js";
import { McpReadStore } from "../../preview/index.js";
import {
  isStateBoardSection,
  RunLogWriter,
  StateRunQueue,
  StateRunStore,
  toSectionFrame,
  toSequenceId,
  toStateRunItems,
  toStateRunPrompt,
} from "../../run-log/index.js";
import type { StateRunPort } from "../../run-log/index.js";
import type { Handle } from "../_core/handler.js";

type StartStatesRunInput = Input<typeof startStatesRun>;

interface BoardPlan {
  readonly baseFrameId: string;
  readonly directionId: string;
  readonly frames: readonly CanvasFileFrame[];
  readonly items: readonly StateRunItem[];
  readonly page: string;
}

const SHOT_FIELDS = {
  colorScheme: null,
  directionId: null,
  element: null,
  height: null,
  isFullPage: false,
  padding: null,
  path: null,
  versionId: null,
  width: null,
} as const;

const getBoardFrame = Effect.fn("run.startStates.getBoardFrame")(function* run(
  input: StartStatesRunInput
) {
  const canvas = yield* CanvasStore;
  const doc = yield* canvas.getDoc(input.projectId);
  const frames = doc.canvas?.frames ?? [];

  const section =
    doc.canvas?.sections?.find((item) => item.id === input.section) ?? null;

  if (section === null) {
    return yield* new NotFound({
      message: `No section ${input.section} on the canvas. Call canvas_list for the section ids.`,
    });
  }

  if (!isStateBoardSection(section)) {
    return yield* new BadRequest({
      message: `Section ${input.section} is not a state board. Make one with create_state_frames_canvas.`,
    });
  }

  const frame = toSectionFrame(frames, section);

  if (frame === null) {
    return yield* new NotFound({
      message: `Section ${input.section} has no frame.`,
    });
  }

  return { directionId: doc.directionId, frame, frames };
});

const getSimilarity = Effect.fn("run.startStates.getSimilarity")(function* run(
  projectId: string,
  baseFrameId: string,
  frameId: string
) {
  const checks = yield* StateCheckStore;
  const reads = yield* McpReadStore;

  const base = yield* reads.screenshot({
    ...SHOT_FIELDS,
    frameId: baseFrameId,
    projectId,
  });

  const view = yield* reads.screenshot({ ...SHOT_FIELDS, frameId, projectId });
  const differsPct = yield* checks.diffPct(base.data, view.data);

  return toStateLikeness(differsPct, STATE_CHECK_THRESHOLD);
});

const getBoardPlan = Effect.fn("run.startStates.getBoardPlan")(function* run(
  input: StartStatesRunInput
) {
  const checks = yield* StateCheckStore;
  const found = yield* getBoardFrame(input);

  const board = yield* checks.board({
    frame: found.frame.id,
    projectId: input.projectId,
  });

  const rows = [];

  for (const frame of board.states) {
    const likeness = yield* getSimilarity(
      input.projectId,
      board.base.frameId,
      frame.frameId
    );

    rows.push({ ...frame, ...likeness });
  }

  const plan: BoardPlan = {
    baseFrameId: board.base.frameId,
    directionId: found.frame.directionId ?? found.directionId,
    frames: found.frames,
    items: toStateRunItems(rows),
    page: board.page,
  };

  return plan;
});

const toCanvasRef = (
  frames: readonly CanvasFileFrame[],
  frameId: string
): RunCanvasRef => {
  const frame = frames.find((item) => item.id === frameId);

  return {
    frameId,
    height: frame?.height ?? 0,
    path: frame?.path ?? "",
    width: frame?.width ?? 0,
  };
};

const toPort = Effect.fn("run.startStates.toPort")(function* run(
  projectId: string,
  plan: BoardPlan
) {
  const writer = yield* RunLogWriter;
  const bus = yield* EventQueue;
  const checks = yield* StateCheckStore;
  const reads = yield* McpReadStore;

  const port: StateRunPort = {
    isStillSame: (frameId) =>
      getSimilarity(projectId, plan.baseFrameId, frameId).pipe(
        Effect.provideService(StateCheckStore, checks),
        Effect.provideService(McpReadStore, reads),
        Effect.map((likeness) => likeness.isSameAsDefault),
        Effect.orElseSucceed(() => true)
      ),
    notify: bus.announce({
      actionId: "run.startStates",
      invalidates: ["run.getStates"],
      projectId,
    }),
    startRun: (item) =>
      writer
        .start({
          body: {
            canvas: toCanvasRef(plan.frames, item.frameId),
            mode: "edit",
            prompt: toStateRunPrompt(plan.page, item.stateName),
          },
          directionId: plan.directionId,
          projectId,
        })
        .pipe(Effect.map((started) => started.runId)),
  };

  return port;
});

const handle = Effect.fn("run.startStates")(function* run(
  input: StartStatesRunInput
) {
  const queue = yield* StateRunQueue;
  const store = yield* StateRunStore;
  const sequenceId = toSequenceId(input.section);

  if (yield* store.isActive(input.projectId, sequenceId)) {
    return yield* new Conflict({
      message: `The states of section ${input.section} are already in design. Read them with get_states_run, or stop the current run with stop_run.`,
    });
  }

  const plan = yield* getBoardPlan(input);

  if (plan.items.length === 0) {
    return yield* new BadRequest({
      message:
        "Every state of this board has its own UI. No state looks like the default.",
    });
  }

  return yield* queue.start({
    items: plan.items,
    port: yield* toPort(input.projectId, plan),
    projectId: input.projectId,
    section: input.section,
    sequenceId,
  });
}) satisfies Handle<typeof startStatesRun>;

export { handle };
