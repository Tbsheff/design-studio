import type { Project } from "@design-studio/contracts";
import { CANVAS_GAP } from "@design-studio/contracts/canvas-file";
import type {
  CanvasFile,
  CanvasFileFrame,
} from "@design-studio/contracts/canvas-file";
import {
  BUILT_IN_STATES,
  DEFAULT_FRAME_STATE,
} from "@design-studio/contracts/frame-state";

import { BadRequestError, NotFoundError } from "../../platform/errors/index.js";
import { applyFrameState, readFrameStates } from "../app-flow/index.js";
import { getWritableContext } from "../frame-ops.js";
import type { LinkRuntime } from "../links/link-runtime.js";
import { applyPlacement, findFrame, PlaceError } from "../tools.js";
import type { PlaceSpec } from "../tools.js";
import {
  toBoardSections,
  toBoardSlots,
  toPageOf,
} from "./engine/to-state-board.js";
import type { BoardSlot, BoardState } from "./engine/to-state-board.js";

interface StateFramesQuery {
  readonly frame: string;
  readonly projectId: string;
  readonly states: readonly string[] | null;
}

interface StateFrame {
  readonly id: string;
  readonly label: string;
  readonly state: string;
}

interface StateFramesCreated {
  readonly frames: readonly StateFrame[];
  readonly reusedFrames: readonly string[];
}

interface StateCatalog {
  readonly pinned: Readonly<Record<string, string>>;
  readonly states: readonly BoardState[];
}

interface BoardMade {
  frames: StateFrame[];
  reused: string[];
}

const BOARD_MAX = 8;

const SEED_SIZE = { height: 900, width: 1440 };

const toCatalog = async (
  runtime: LinkRuntime,
  project: Project
): Promise<StateCatalog> => {
  if (!project.app) {
    return { pinned: {}, states: BUILT_IN_STATES };
  }

  const view = await readFrameStates(runtime.frameStates, project);

  return { pinned: view.frames, states: view.states };
};

const toWanted = (
  catalog: StateCatalog,
  ids: readonly string[] | null
): BoardState[] => {
  const shown = catalog.states.filter(
    (state) => state.id !== DEFAULT_FRAME_STATE
  );

  if (ids === null) {
    return shown.slice(0, BOARD_MAX);
  }

  return [...new Set(ids)].map((id) => {
    const found = shown.find((state) => state.id === id);

    if (!found) {
      throw new BadRequestError(
        `Unknown state ${id}. Use one of: ${shown.map((state) => state.id).join(", ")}.`
      );
    }

    return found;
  });
};

const toSeeded = (file: CanvasFile): CanvasFile => {
  if (file.frames.length > 0) {
    return file;
  }

  return {
    ...file,
    frames: [{ ...SEED_SIZE, id: "f1", order: 0, x: 0, y: 0 }],
  };
};

const toSource = (file: CanvasFile, ref: string): CanvasFileFrame => {
  const frame = findFrame(file.frames, ref);

  if (!frame) {
    throw new NotFoundError(
      `No frame ${ref}. Call canvas_list for the ids and labels.`
    );
  }

  return frame;
};

const toSpec = (slot: BoardSlot, page: string): PlaceSpec => {
  const spec: PlaceSpec = {
    height: slot.height,
    label: slot.label,
    width: slot.width,
    x: slot.x,
    y: slot.y,
  };

  if (page !== "") {
    return { ...spec, path: page };
  }

  return spec;
};

const toPlacedFile = (
  file: CanvasFile,
  specs: readonly PlaceSpec[],
  directionId: string
): { file: CanvasFile; placed: CanvasFileFrame[] } => {
  try {
    return applyPlacement(file, specs, directionId);
  } catch (error) {
    if (error instanceof PlaceError) {
      throw new BadRequestError(error.message);
    }

    throw error;
  }
};

const toBoardFile = (
  raw: CanvasFile,
  query: StateFramesQuery,
  input: { catalog: StateCatalog; directionId: string; wanted: BoardState[] },
  made: BoardMade
): CanvasFile => {
  const file = toSeeded(raw);
  const origin = toSource(file, query.frame);
  const page = toPageOf(origin);

  const slots = toBoardSlots({
    frames: file.frames,
    gap: CANVAS_GAP,
    pinned: input.catalog.pinned,
    source: origin,
    states: input.wanted,
  });

  const fresh = slots.filter((slot) => slot.frameId === null);

  const placed = toPlacedFile(
    file,
    fresh.map((slot) => toSpec(slot, page)),
    origin.directionId ?? input.directionId
  );

  const ids = new Map(fresh.map((slot, index) => [slot, placed.placed[index]]));

  made.frames = slots.flatMap((slot) => {
    const id = slot.frameId ?? ids.get(slot)?.id ?? null;

    if (id === null) {
      return [];
    }

    return [{ id, label: slot.label, state: slot.state }];
  });

  made.reused = slots.flatMap((slot) => {
    if (slot.frameId === null) {
      return [];
    }

    return [slot.frameId];
  });

  return {
    ...placed.file,
    sections: toBoardSections(placed.file.sections, page, slots),
  };
};

const setBoardStates = async (
  runtime: LinkRuntime,
  project: Project,
  catalog: StateCatalog,
  frames: readonly StateFrame[]
): Promise<void> => {
  if (!project.app) {
    return;
  }

  const [first, ...rest] = frames.filter(
    (frame) => catalog.pinned[frame.id] !== frame.state
  );

  if (!first) {
    return;
  }

  await applyFrameState(runtime.frameStates, project, {
    frame: first.id,
    state: first.state,
  });

  await setBoardStates(runtime, project, catalog, rest);
};

const createStateBoard = async (
  runtime: LinkRuntime,
  query: StateFramesQuery
): Promise<StateFramesCreated> => {
  const context = await getWritableContext(runtime, {
    directionId: null,
    projectId: query.projectId,
  });

  const { project } = context;
  const catalog = await toCatalog(runtime, project);
  const wanted = toWanted(catalog, query.states);

  if (wanted.length === 0) {
    throw new BadRequestError("There are no frame states to show.");
  }

  const made: BoardMade = { frames: [], reused: [] };
  const directionId = context.direction.id;
  const input = { catalog, directionId, wanted };

  await context.canvas.update(
    project,
    (file) => toBoardFile(file, query, input, made),
    { source: "agent" }
  );

  await setBoardStates(runtime, project, catalog, made.frames);

  return { frames: made.frames, reusedFrames: made.reused };
};

export { createStateBoard };

export type { StateFrame, StateFramesCreated, StateFramesQuery };
