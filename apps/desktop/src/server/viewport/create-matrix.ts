import { Effect, Result } from "effect";

import {
  applyPlacement,
  attemptKnown,
  BadRequest,
  CANVAS_GAP,
  setForcedState,
} from "./deps.js";
import type { CanvasFile, CanvasFileFrame, PlaceSpec } from "./deps.js";
import { toCells } from "./engine/cells.js";
import type { CellScheme, MatrixRequest } from "./engine/cells.js";
import { toGrid } from "./engine/grid.js";
import type { GridOrigin, GridSlot } from "./engine/grid.js";
import type { ViewportRuntime } from "./viewport-runtime.js";

interface MatrixCommand extends MatrixRequest {
  readonly directionId: string;
  readonly page: string;
  readonly projectId: string;
}

interface PlacedFrame {
  readonly frameId: string;
  readonly height: number;
  readonly label: string;
  readonly left: number;
  readonly scheme: CellScheme;
  readonly top: number;
  readonly width: number;
}

interface MatrixCreated {
  readonly frames: readonly PlacedFrame[];
  readonly page: string;
}

interface PlacementOutcome {
  placement: Placement | null;
  refusal: string | null;
}

interface Placement {
  readonly file: CanvasFile;
  readonly placed: readonly CanvasFileFrame[];
  readonly slots: readonly GridSlot[];
}

const SEED_FRAME: CanvasFileFrame = {
  height: 900,
  id: "f1",
  order: 0,
  width: 1440,
  x: 0,
  y: 0,
};

const ROW_GAP_FACTOR = 2;

const seedFrames = (file: CanvasFile): CanvasFile => {
  if (file.frames.length > 0) {
    return file;
  }

  return { ...file, frames: [SEED_FRAME] };
};

const originOf = (frames: readonly CanvasFileFrame[]): GridOrigin => {
  const shown = frames.filter((frame) => !frame.hidden);
  const gap = CANVAS_GAP;

  if (shown.length === 0) {
    return { gap, left: 0, top: 0 };
  }

  const bottom = Math.max(...shown.map((frame) => frame.y + frame.height));
  const left = Math.min(...shown.map((frame) => frame.x));

  return { gap, left, top: bottom + gap * ROW_GAP_FACTOR };
};

const isSameCell = (
  frame: CanvasFileFrame,
  slot: GridSlot,
  page: string
): boolean => frame.label === slot.cell.label && (frame.path ?? "") === page;

const toSpec = (
  slot: GridSlot,
  page: string,
  frames: readonly CanvasFileFrame[]
): PlaceSpec => {
  const existing = frames.find((frame) => isSameCell(frame, slot, page));

  const spec: PlaceSpec = {
    height: slot.cell.height,
    label: slot.cell.label,
    path: page,
    width: slot.cell.width,
    x: slot.left,
    y: slot.top,
  };

  if (existing) {
    return { ...spec, frame: existing.id };
  }

  return spec;
};

const placeCells = (
  file: CanvasFile,
  command: MatrixCommand,
  directionId: string
): Placement => {
  const seeded = seedFrames(file);
  const cells = toCells(command);

  const fresh = seeded.frames.filter(
    (frame) =>
      !cells.some(
        (cell) =>
          cell.label === frame.label && (frame.path ?? "") === command.page
      )
  );

  const slots = toGrid(cells, originOf(fresh));
  const specs = slots.map((slot) => toSpec(slot, command.page, seeded.frames));
  const next = applyPlacement(seeded, specs, directionId);

  return { file: next.file, placed: next.placed, slots };
};

const messageOf = (cause: unknown): string => {
  if (cause instanceof Error) {
    return cause.message;
  }

  return String(cause);
};

const toPlaced = (
  slots: readonly GridSlot[],
  placed: readonly CanvasFileFrame[]
): readonly PlacedFrame[] =>
  slots.flatMap((slot, index) => {
    const frame = placed[index];

    if (!frame) {
      return [];
    }

    return [
      {
        frameId: frame.id,
        height: frame.height,
        label: slot.cell.label,
        left: frame.x,
        scheme: slot.cell.scheme,
        top: frame.y,
        width: frame.width,
      },
    ];
  });

const forceSchemes = (
  owner: string,
  all: readonly CanvasFileFrame[],
  placed: readonly PlacedFrame[]
): void => {
  for (const item of placed) {
    let forced: "dark" | null = null;

    if (item.scheme === "dark") {
      forced = "dark";
    }

    setForcedState({
      frameId: item.frameId,
      frames: all,
      layer: null,
      projectId: owner,
      state: forced,
    });
  }
};

const createMatrix = Effect.fn("createMatrix")(function* run(
  runtime: ViewportRuntime,
  command: MatrixCommand
) {
  const { direction, project } = yield* attemptKnown(() =>
    runtime.loadDirection(command.projectId, command.directionId)
  );

  const outcome: PlacementOutcome = { placement: null, refusal: null };

  const snapshot = yield* attemptKnown(() =>
    runtime.canvas.update(
      project,
      (file) => {
        const placed = Result.try(() =>
          placeCells(file, command, direction.id)
        );

        if (Result.isFailure(placed)) {
          outcome.refusal = messageOf(placed.failure);

          return file;
        }

        outcome.placement = placed.success;

        return placed.success.file;
      },
      { source: "agent" }
    )
  );

  if (outcome.refusal !== null || outcome.placement === null) {
    return yield* new BadRequest({
      message: outcome.refusal ?? "The matrix placement did not run.",
    });
  }

  const frames = toPlaced(outcome.placement.slots, outcome.placement.placed);

  forceSchemes(project.id, snapshot.canvas?.frames ?? [], frames);

  return { frames, page: command.page };
});

export { createMatrix };

export type { MatrixCommand, MatrixCreated, PlacedFrame };
