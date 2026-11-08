import type { BridgeToParent, SelectMove } from "@design-studio/contracts";

import type { ParentMessageBody } from "../../platform/bridge.js";
import {
  frontFrame,
  postFront,
  requestRects,
  watchTree,
} from "./preview-frames-core.js";
import { selectRelative } from "./preview-frames-select.js";
import { holdSwap, onFrameLoad } from "./preview-frames-swap.js";
import type { PreviewState } from "./preview-frames-types.js";

interface PreviewApi {
  clearSelection: () => void;
  holdSwap: (isHeld: boolean, shouldSettle: boolean) => void;
  hoverNode: (id: number | null) => void;
  listen: (handler: (message: BridgeToParent) => void) => () => void;
  onFrameLoad: (token: string) => void;
  post: (body: ParentMessageBody) => void;
  refreshRects: () => void;
  selectNode: (id: number, isAdditive: boolean) => void;
  selectRelative: (selector: string, move: SelectMove) => void;
  watchTree: (isOn: boolean) => void;
}

const toPreviewApi = (state: PreviewState): PreviewApi => ({
  clearSelection: () => postFront(state, { type: "clear" }),
  holdSwap: (isHeld, shouldSettle) => holdSwap(state, isHeld, shouldSettle),
  hoverNode: (id) => postFront(state, { id, type: "hover-node" }),
  listen: (handler) => {
    state.listeners.add(handler);

    return (): void => {
      state.listeners.delete(handler);
    };
  },
  onFrameLoad: (token) => onFrameLoad(state, token),
  post: (body) => postFront(state, body),
  refreshRects: () => requestRects(state, frontFrame(state)),
  selectNode: (nodeId, isAdditive) =>
    postFront(state, { additive: isAdditive, id: nodeId, type: "select-node" }),
  selectRelative: (selector, move) => selectRelative(state, selector, move),
  watchTree: (isOn) => watchTree(state, isOn),
});

export { toPreviewApi };

export type { PreviewApi };
