import type { ForcedFrameState, ForcedStateWire, StyleState } from "./deps.js";

const MAX_FRAMES = 500;

const forcedFrames = new Map<string, Map<string, ForcedStateWire>>();

const framesOf = (projectId: string): Map<string, ForcedStateWire> => {
  const existing = forcedFrames.get(projectId);

  if (existing) {
    return existing;
  }

  const created = new Map<string, ForcedStateWire>();
  forcedFrames.set(projectId, created);

  return created;
};

const setForced = (
  projectId: string,
  frameId: string,
  selector: string | null,
  state: StyleState | null
): void => {
  const frames = framesOf(projectId);

  if (state === null) {
    frames.delete(frameId);

    return;
  }

  if (!frames.has(frameId) && frames.size >= MAX_FRAMES) {
    const [oldest] = frames.keys();

    if (oldest) {
      frames.delete(oldest);
    }
  }

  frames.set(frameId, { selector, state });
};

const forcedOf = (projectId: string, frameId: string): ForcedStateWire | null =>
  forcedFrames.get(projectId)?.get(frameId) ?? null;

const forcedList = (projectId: string): ForcedFrameState[] =>
  [...framesOf(projectId).entries()].map(([frameId, forced]) => ({
    frameId,
    selector: forced.selector,
    state: forced.state,
  }));

export { forcedList, forcedOf, setForced };
