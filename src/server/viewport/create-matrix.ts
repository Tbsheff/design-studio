import {
  applyPlacement,
  BadRequestError,
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

const toSpec = (
  slot: GridSlot,
  page: string,
  frames: readonly CanvasFileFrame[]
): PlaceSpec => {
  const existing = frames.find((frame) => frame.label === slot.cell.label);

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
  const slots = toGrid(toCells(command), originOf(seeded.frames));
  const specs = slots.map((slot) => toSpec(slot, command.page, seeded.frames));

  try {
    const next = applyPlacement(seeded, specs, directionId);

    return { file: next.file, placed: next.placed, slots };
  } catch (error) {
    if (error instanceof Error) {
      throw new BadRequestError(error.message);
    }

    throw error;
  }
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

const createMatrix = async (
  runtime: ViewportRuntime,
  command: MatrixCommand
): Promise<MatrixCreated> => {
  const { direction, project } = await runtime.loadDirection(
    command.projectId,
    command.directionId
  );

  let slots: readonly GridSlot[] = [];
  let placed: readonly CanvasFileFrame[] = [];

  const snapshot = await runtime.canvas.update(
    project,
    (file) => {
      const next = placeCells(file, command, direction.id);

      ({ placed, slots } = next);

      return next.file;
    },
    { source: "agent" }
  );

  const frames = toPlaced(slots, placed);

  forceSchemes(project.id, snapshot.canvas?.frames ?? [], frames);

  return { frames, page: command.page };
};

export { createMatrix };

export type { MatrixCommand, MatrixCreated, PlacedFrame };
