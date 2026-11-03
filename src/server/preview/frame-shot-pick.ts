import type { ForcedStateWire } from "../../shared/state-styles.js";
import { frameStatesView, stateOfFrame } from "../app/frame-state.js";
import { readProjectCanvas } from "../canvas/service.js";
import { findFrame } from "../canvas/tools.js";
import { forcedOf } from "../state-styles/forced-store.js";
import { NotFoundError } from "../store/errors.js";
import type { StudioProjectStore } from "../store/projects.js";
import type { ShotQuery } from "./frame-source.js";

interface FramePick {
  readonly directionId: string | null;
  readonly forced: ForcedStateWire | null;
  readonly height: number | null;
  readonly path: string | null;
  readonly state: string | null;
  readonly versionId: string | null;
  readonly width: number | null;
}

const toForced = (projectId: string, frameId: string): ForcedStateWire | null =>
  forcedOf(projectId, frameId) ?? null;

const toNoPick = (query: ShotQuery): FramePick => ({
  directionId: query.directionId,
  forced: null,
  height: null,
  path: null,
  state: null,
  versionId: query.versionId,
  width: null,
});

const toDirectionId = (
  query: ShotQuery,
  frameDirectionId: string | null
): string | null => {
  if (query.directionId === null && query.versionId === null) {
    return frameDirectionId;
  }

  return query.directionId;
};

const toState = async (
  projects: StudioProjectStore,
  projectId: string,
  frameId: string
): Promise<string | null> => {
  const view = await frameStatesView(projects.projectDir(projectId));

  return stateOfFrame(view, frameId) || null;
};

const pickFrame = async (
  projects: StudioProjectStore,
  query: ShotQuery
): Promise<FramePick> => {
  if (query.frameId === null) {
    return toNoPick(query);
  }

  const project = await projects.get(query.projectId);

  const read = await readProjectCanvas(project, (id) =>
    projects.projectDir(id)
  );

  const frames = read.canvas?.frames ?? [];

  if (frames.length === 0 && query.frameId === "f1") {
    return { ...toNoPick(query), forced: toForced(project.id, "f1") };
  }

  const frame = findFrame(frames, query.frameId);

  if (!frame) {
    throw new NotFoundError(`no frame ${query.frameId} on the canvas`);
  }

  let state: string | null = null;

  if (project.app) {
    state = await toState(projects, project.id, frame.id);
  }

  const picked = {
    directionId: toDirectionId(query, frame.directionId ?? null),
    forced: toForced(project.id, frame.id),
    height: frame.height,
    path: frame.path ?? null,
    versionId: query.versionId,
    width: frame.width,
  };

  return { ...picked, state };
};

export { pickFrame };

export type { FramePick };
