import type { Project } from "@design-studio/contracts";
import { BUILT_IN_STATES } from "@design-studio/contracts/frame-state";
import { PNG } from "pngjs";

import { NotFoundError } from "../../platform/errors/index.js";
import { diffPictures } from "../../preview/picture-diff/index.js";
import { readFrameStates } from "../app-flow/index.js";
import type { LinkRuntime } from "../links/link-runtime.js";
import { findFrame } from "../tools.js";
import type { BoardState } from "./engine/to-state-board.js";
import { toCheckBoard } from "./engine/to-state-likeness.js";
import type { CheckBoard } from "./engine/to-state-likeness.js";

interface StateCheckQuery {
  readonly frame: string;
  readonly projectId: string;
}

interface StateCatalog {
  readonly pinned: Readonly<Record<string, string>>;
  readonly states: readonly BoardState[];
}

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

const getCheckBoard = async (
  runtime: LinkRuntime,
  query: StateCheckQuery
): Promise<CheckBoard> => {
  const project = await runtime.projects.get(query.projectId);
  const snapshot = await runtime.canvas.read(project);
  const list = snapshot.canvas?.frames ?? [];
  const found = findFrame(list, query.frame);

  if (!found) {
    throw new NotFoundError(
      `No frame ${query.frame}. Call canvas_list for the ids and labels.`
    );
  }

  const catalog = await toCatalog(runtime, project);

  const board = toCheckBoard({
    frames: list,
    pinned: catalog.pinned,
    source: found,
    states: catalog.states,
  });

  if (board === null) {
    throw new NotFoundError(
      `Frame ${query.frame} has no state board. Call create_state_frames_canvas first.`
    );
  }

  return board;
};

const toDiffPct = (base: string, other: string): number => {
  const first = PNG.sync.read(Buffer.from(base, "base64"));
  const second = PNG.sync.read(Buffer.from(other, "base64"));

  return diffPictures(first, second).differsPct;
};

export { getCheckBoard, toDiffPct };

export type { StateCheckQuery };
