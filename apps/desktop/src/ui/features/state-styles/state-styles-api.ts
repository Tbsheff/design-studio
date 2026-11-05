import { activeFrame, call, canvasStore, stateStyleRoutes } from "./deps.js";
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

const listStates = (
  ids: StateIds,
  source: SourceLoc
): Promise<StateListResult> =>
  call(stateStyleRoutes.inspectStateStyle, {
    col: source.col,
    directionId: ids.directionId,
    file: source.file,
    limit: 200,
    line: source.line,
    projectId: ids.projectId,
  });

const frameIdOf = (projectId: string): string | null => {
  const layout = canvasStore.get(projectId);

  if (!layout) {
    return null;
  }

  return activeFrame(layout).id;
};

const sendForced = async (
  ids: StateIds,
  selector: string | null,
  next: StyleState | null
): Promise<ForcedFrameState | null> => {
  const frameId = frameIdOf(ids.projectId);

  const base = {
    directionId: ids.directionId,
    layer: selector,
    projectId: ids.projectId,
    state: next,
  };

  try {
    if (frameId === null) {
      return await call(stateStyleRoutes.setForcedStateStyle, base);
    }

    return await call(stateStyleRoutes.setForcedStateStyle, {
      ...base,
      frameId,
    });
  } catch {
    return null;
  }
};

export { listStates, sendForced };

export type { StateIds };
