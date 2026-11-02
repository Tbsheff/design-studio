import { findFrame } from "./deps.js";
import type { CanvasFileFrame, ForcedFrameState, StyleState } from "./deps.js";
import { StateStyleError } from "./errors.js";
import { setForced } from "./forced-store.js";

interface ForcedStateRequest {
  readonly frameId: string;
  readonly frames: readonly CanvasFileFrame[];
  readonly layer: string | null;
  readonly projectId: string;
  readonly state: StyleState | null;
}

const NEEDS_LAYER =
  "Pass layer, the CSS selector of the layer, for this state. Only dark works without a layer.";

const frameIdOf = (request: ForcedStateRequest): string => {
  const hit = findFrame(request.frames, request.frameId);

  if (hit !== null) {
    return hit.id;
  }

  if (request.frames.length === 0 && request.frameId === "f1") {
    return "f1";
  }

  throw new StateStyleError(
    `No canvas frame has the id or label ${request.frameId}.`
  );
};

const setForcedState = (request: ForcedStateRequest): ForcedFrameState => {
  const frameId = frameIdOf(request);
  const needsLayer = request.state !== null && request.state !== "dark";

  if (needsLayer && request.layer === null) {
    throw new StateStyleError(NEEDS_LAYER);
  }

  setForced(request.projectId, frameId, request.layer, request.state);

  return { frameId, selector: request.layer, state: request.state };
};

const forcedSummary = (forced: ForcedFrameState): string => {
  if (forced.state === null) {
    return `Frame ${forced.frameId} shows no forced state.`;
  }

  const on = forced.selector ?? "the page";

  return `Frame ${forced.frameId} shows ${forced.state} on ${on}. Use get_screenshot with frameId ${forced.frameId} to see it.`;
};

export { forcedSummary, setForcedState };

export type { ForcedStateRequest };
