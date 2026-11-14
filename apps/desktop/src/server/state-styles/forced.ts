import { findFrame, isEdgeStateName } from "./deps.js";
import type { CanvasFileFrame, ForcedStateChange, StyleState } from "./deps.js";
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

const setForcedState = (request: ForcedStateRequest): ForcedStateChange => {
  const frameId = frameIdOf(request);

  if (request.state !== null && isEdgeStateName(request.state)) {
    setForced(request.projectId, frameId, null, null);

    return {
      frameId,
      isStructural: true,
      selector: request.layer,
      state: request.state,
    };
  }

  const needsLayer = request.state !== null && request.state !== "dark";

  if (needsLayer && request.layer === null) {
    throw new StateStyleError(NEEDS_LAYER);
  }

  setForced(request.projectId, frameId, request.layer, request.state);

  return {
    frameId,
    isStructural: false,
    selector: request.layer,
    state: request.state,
  };
};

const forcedSummary = (forced: ForcedStateChange): string => {
  if (forced.isStructural) {
    return `${forced.state ?? "This state"} is a structural state: it matches the place of the layer among its siblings, so there is nothing to force. Frame ${forced.frameId} does not change.`;
  }

  if (forced.state === null) {
    return `Frame ${forced.frameId} shows no forced state.`;
  }

  const on = forced.selector ?? "the page";

  return `Frame ${forced.frameId} shows ${forced.state} on ${on}. Use get_screenshot with frameId ${forced.frameId} to see it.`;
};

export { forcedSummary, setForcedState };

export type { ForcedStateRequest };
