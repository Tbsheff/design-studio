import { activeFrame, canvasStore, json } from "./deps.js";
import type {
  ForcedFrameState,
  SourceLoc,
  StateListResult,
  StyleState,
} from "./deps.js";

interface StateIds {
  readonly directionId: string;
  readonly projectId: string;
}

interface ForcedBody {
  frameId?: string;
  readonly layer: string | null;
  readonly state: StyleState | null;
}

const pathOf = (ids: StateIds): string =>
  `/api/projects/${encodeURIComponent(ids.projectId)}/d/${encodeURIComponent(ids.directionId)}/state-styles`;

const listStates = (
  ids: StateIds,
  source: SourceLoc
): Promise<StateListResult> => {
  const query = new URLSearchParams({
    col: String(source.col),
    file: source.file,
    line: String(source.line),
  });

  return json<StateListResult>("GET", `${pathOf(ids)}?${query.toString()}`);
};

const frameIdOf = (projectId: string): string | null => {
  const layout = canvasStore.get(projectId);

  if (!layout) {
    return null;
  }

  return activeFrame(layout).id;
};

const sendForced = async (
  ids: StateIds,
  layer: string | null,
  state: StyleState | null
): Promise<ForcedFrameState | null> => {
  const body: ForcedBody = { layer, state };
  const frameId = frameIdOf(ids.projectId);

  if (frameId !== null) {
    body.frameId = frameId;
  }

  try {
    return await json<ForcedFrameState>("POST", `${pathOf(ids)}/forced`, body);
  } catch {
    return null;
  }
};

export { listStates, sendForced };

export type { StateIds };
